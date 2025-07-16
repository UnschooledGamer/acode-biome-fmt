/// <reference types="../node_modules/@acode-app/types/src/index.d.ts" />
import type { WCPage } from "@acode-app/types/src/editor/page.d.ts";
import type { EditorFile } from "@acode-app/types/src/editor/file.d.ts";
import plugin from "../plugin.json" with { type: "json" };

const SUPPORTED_FILE_EXTENSIONS = [
  "js",
  "ts",
  "jsx",
  "tsx",
  "json",
  "css",
  "graphql",
] as const;

class AcodePlugin {
  public baseUrl: string | undefined;
  private biomeWorker: Worker | null = null;

  async init(
    $page: WCPage,
    cacheFile: any,
    cacheFileUrl: string,
  ): Promise<void> {
    console.log("init");

    acode.registerFormatter(
      plugin.id,
      [...SUPPORTED_FILE_EXTENSIONS],
      this.format.bind(this),
    );

    // NOTE: Webpack (build Tool) sees this url and Transforms it to a valid URL,
    // transpiled URL/file (i.e worker.js)
    this.biomeWorker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });

    this.biomeWorker.addEventListener("message", (event) => {
      console.log(
        `%cbiome Worker :: %cin-msg`,
        "color: #4CAF50; font-weight: bold;",
        "color: #2196F3; font-weight: bold;",
        event.data,
      );

      if (event.data.type === "init") {
        console.info(`biome Worker :: [🔥] Initialized`);
        return;
      }
      if (event.data.type === "updated") {
        if (
          event.data.biomeOutput.code == "Can't format with errors" ||
          event.data.biomeOutput.code == "Not Supported"
        )
          return;

        if (event.data.biomeOutput.error) {
          console.error(
            `biome Worker :: [❌] Error`,
            event.data.biomeOutput.error,
          );
          return window.toast(
            `Can't format with errors (check Console for Errors)`,
            3000,
          );
        }

        const file = editorManager.getFile(event.data.path, "uri");

        if (!file) return;

        this.#updateFileContents(file, event.data.biomeOutput.code);
      }
    });

    this.biomeWorker.addEventListener("messageerror", (...args) =>
      console.log(`biome Worker :: in-msg-error`, ...args),
    );

    this.biomeWorker.addEventListener("error", (...args) =>
      console.log(`biome Worker :: Worker Error`, ...args),
    );

    this.biomeWorker.postMessage({
      type: "init",
    });
  }

  async format() {
    // get contents from editor
    const contents = editorManager.editor.session.getValue();
    const activeFile = editorManager.activeFile;

    const biomeConfig = await this.#findBiomeConfig(activeFile.uri);

    // send contents to biome worker
    this.biomeWorker?.postMessage({
      type: "formatContent",
      path: activeFile.uri,
      content: contents,
      config: biomeConfig, // can be null
    });
  }

  /**
   * Finds the biome.json configuration file by traversing up from the file's directory.
   * @param {string} fileUri The URI of the file.
   * @returns {Promise<string | null>} The content of biome.json or null if not found.
   */
  async #findBiomeConfig(fileUri: string): Promise<string | null> {
    if (!fileUri) {
      return null;
    }

    let path = fileUri;
    if (path.startsWith("file://")) {
      path = new URL(path).pathname;
    }

    let dir = path.substring(0, path.lastIndexOf("/"));

    while (dir && dir !== "/") {
      const configPath = `${dir}/biome.json`;
      try {
        const fs = acode.fsOperation(configPath);
        const stats = await fs.stat();
        if (stats.isFile) {
          const configContent = await fs.readFile("utf-8");
          return configContent as string;
        }
      } catch (e) {
        // ignore error, file does not exist
      }
      const parentDir = dir.substring(0, dir.lastIndexOf("/"));
      if (parentDir === dir) {
        // reached root
        break;
      }
      dir = parentDir;
    }
    return null;
  }

  /**
   * Updates the contents of the file, and updates undoManager's actions state
   * used After receiving the formatted contents from the Biome worker.
   * @param {EditorFile} file
   * @param {string} contents
   */
  #updateFileContents(file: EditorFile, contents: string) {
    const { session } = file;
    //@ts-ignore Property does not exist on type 'UndoManager'. (ts 2339), for some reason.
    const { $undoStack, $redoStack, $rev, $mark } = Object.assign(
      {},
      session.getUndoManager(),
    );
    session.setValue(contents);
    const undoManager = session.getUndoManager();
    // @ts-ignore
    undoManager.$undoStack = $undoStack;
    // @ts-ignore
    undoManager.$redoStack = $redoStack;
    // @ts-ignore
    undoManager.$rev = $rev;
    // @ts-ignore
    undoManager.$mark = $mark;
  }

  destroy() {
    // Add your cleanup code here
    console.log(plugin.name, "cleaning...");
    if (this.biomeWorker) {
      this.biomeWorker.terminate();
      this.biomeWorker = null;
    }

    console.log(plugin.name, "destroyed (cleanup complete)!");
  }
}

if (window.acode) {
  const acodePlugin = new AcodePlugin();
  acode.setPluginInit(
    plugin.id,
    async (
      baseUrl: string,
      $page: WCPage,
      { cacheFileUrl, cacheFile }: any,
    ) => {
      if (!baseUrl.endsWith("/")) {
        baseUrl += "/";
      }
      acodePlugin.baseUrl = baseUrl;
      await acodePlugin.init($page, cacheFile, cacheFileUrl);
    },
  );
  acode.setPluginUnmount(plugin.id, () => {
    acodePlugin.destroy();
  });
}
