# Acode Biome Formatter

> This Plugin is in Development. Please use at your own risk.

This plugin for Acode provides code formatting using the Biome toolchain.

## Features

-   Formats `js`, `ts`, `jsx`, `tsx`, `json`, `css`, and `graphql` files.
-   Integrates with Acode's formatting API.
-   Uses a web worker for performance.

## Task Checklist

-   [x] Implement basic formatting functionality.
- [ ] Over-All Logging, Put Debug info behide a settings flag.
- [ ] Implement Update Files for Worker
- [ ] Detection of Biome Config File.
- [ ] Detection for Biome Config File in same directory(i.e Mono-Repo support
- [ ] Removal of Files/Folder from MemoryFileSystem by on-remove-folder/file, on-add-folder/file events.
-   [ ] Add a settings page.
- [ ] Setup changeset
-   [ ] Publish the plugin.

## Usage

1.  Install the plugin in Acode.
2.  Open a supported file type.
3.  Run the "Format" command from the command palette or by using the keyboard shortcut.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the [AGPL3.0 License].
