import init, {
  Workspace,
  MemoryFileSystem,
  type Configuration,
  DiagnosticPrinter,
  type ProjectKey,
  type RuleCategories,
  type RuleCode,
} from "@biomejs/wasm-web";

let WASMInitialized = false;

const encoder = new TextEncoder();

let filesystem: MemoryFileSystem | null = null;

let workspace: Workspace | null = null;

let projectKey: ProjectKey | null = null;

// Extracted from biomejs Playground
// TODO: Maybe move this to Main file. (We send it from there)
const defaultBIOMESettingsExtracted = {
  lineWidth: 80,
  indentWidth: 2,
  indentStyle: "tab",
  quoteStyle: "double",
  jsxQuoteStyle: "double",
  quoteProperties: "asNeeded",
  trailingCommas: "all",
  semicolons: "always",
  arrowParentheses: "always",
  attributePosition: "auto",
  bracketSpacing: true,
  bracketSameLine: false,
  expand: "auto",
  lintRules: "recommend",
  enabledLinting: true,
  analyzerFixMode: "safeFixes",
  enabledAssist: true,
  unsafeParameterDecoratorsEnabled: true,
  allowComments: true,
  ruleDomains: {},
  indentScriptAndStyle: false,
  whitespaceSensitivity: "css",
} as const;

const DEFAULT_BIOME_SETTINGS: Configuration = {
  formatter: {
    enabled: true,
    formatWithErrors: true,
    lineWidth: defaultBIOMESettingsExtracted.lineWidth,
    indentStyle: defaultBIOMESettingsExtracted.indentStyle,
    attributePosition: "multiline",
    expand: "never",
  },

  linter: {
    enabled: defaultBIOMESettingsExtracted.enabledLinting,
    domains: defaultBIOMESettingsExtracted.ruleDomains,
  },

  assist: {
    enabled: defaultBIOMESettingsExtracted.enabledAssist,
  },

  javascript: {
    formatter: {
      quoteStyle: defaultBIOMESettingsExtracted.quoteStyle,
      jsxQuoteStyle: defaultBIOMESettingsExtracted.jsxQuoteStyle,
      quoteProperties: defaultBIOMESettingsExtracted.quoteProperties,
      trailingCommas: defaultBIOMESettingsExtracted.trailingCommas,
      semicolons: defaultBIOMESettingsExtracted.semicolons,
      arrowParentheses: defaultBIOMESettingsExtracted.arrowParentheses,
      bracketSpacing: defaultBIOMESettingsExtracted.bracketSpacing,
      bracketSameLine: defaultBIOMESettingsExtracted.bracketSameLine,
      attributePosition: defaultBIOMESettingsExtracted.attributePosition,
    },
    parser: {
      unsafeParameterDecoratorsEnabled:
        defaultBIOMESettingsExtracted.unsafeParameterDecoratorsEnabled,
    },
  },
};

self.addEventListener("message", async (msgEvent) => {
  const { data: msgData } = msgEvent;

  switch (msgData.type) {
    case "init":
      if (WASMInitialized) {
        return self.postMessage({
          type: "response",
          data: {
            WASMInitialized,
            message: "Worker is Already Initialized.",
          },
        });
      }

      try {
        await init();

        filesystem = new MemoryFileSystem();
        workspace = Workspace.withFileSystem(filesystem);
        projectKey = workspace.openProject({
          openUninitialized: true,
          path: "/",
        }).projectKey;

        WASMInitialized = true;

        self.postMessage({
          type: "init",
          data: {
            message: "Worker Initialized Successfully.",
            loadingState: 1,
            projectKey,
          },
        });
      } catch (error) {
        console.error(`Failed to Initialize Worker due to Error: `, error);

        self.postMessage({
          type: "init",
          data: {
            message: "Worker Initialization Failed.",
            loadingState: 0,
            error: error,
          },
        });
      }
      break;

    case "formatContent": {
      if (!projectKey || !workspace || !filesystem) return;

      const formatContent = msgData.content;
      const path = msgData.path;

      filesystem.insert(path, encoder.encode(formatContent));

      workspace.updateSettings({
        projectKey,
        configuration: {
          ...DEFAULT_BIOME_SETTINGS,
        },
      });

      workspace.openFile({
        projectKey,
        path,
        content: {
          type: "fromServer",
        },
        persistNodeCache: true,
      });

      const fileFeatures = workspace.fileFeatures({
        features: ["format", "lint"],
        path,
        projectKey,
      });

      let formatterIr = "";
      try {
        formatterIr =
          fileFeatures.featuresSupported.debug === "supported"
            ? workspace.getFormatterIr({
                projectKey,
                path,
              })
            : "Not supported";
      } catch (e) {
        console.error(e);
        formatterIr = "Can't format";
      }

      let formattedContent = {
        code: "",
        error: null,
      };

      try {
        formattedContent =
          fileFeatures.featuresSupported.format === "supported"
            ? workspace.formatFile({
                projectKey,
                path,
              })
            : { code: "Not Supported" };
      } catch (error: any) {
        console.error(`Failed to Format File due to Error: `, error);

        formattedContent = { code: "Can't Format with Errors", error };
      }

      self.postMessage({
        type: "updated",
        path,
        biomeOutput: {
          fileFeatures,
          code: formattedContent.code,
          error: formattedContent.error,
        },
      });
    }
  }
});
