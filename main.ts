import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
const { Octokit } = require("@octokit/rest");

// Remember to rename these classes and interfaces!

interface GistPluginSettings {
	githubToken: string;
	baseUrl: string;
}

const DEFAULT_SETTINGS: GistPluginSettings = {
	githubToken: '',
	baseUrl: 'https://api.github.com'
}

export default class GistPlugin extends Plugin {
	settings: GistPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		// const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
		// 	// Called when the user clicks the icon.
		// 	new Notice('This is a notice!');
		// });
		// Perform additional things with the ribbon
		// ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		// const statusBarItemEl = this.addStatusBarItem();
		// statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'create-gist',
			name: 'Create Gist',
			callback: () => {
				this.uploadCurrentFileToGist().then(response => {
					new GistModal(this.app, response.data.html_url).open();
				});
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		// this.addCommand({
		// 	id: 'sample-editor-command',
		// 	name: 'Sample editor command',
		// 	editorCallback: (editor: Editor, view: MarkdownView) => {
		// 		console.log(editor.getSelection());
		// 		editor.replaceSelection('Sample Editor Command');
		// 	}
		// });
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		// this.addCommand({
		// 	id: 'open-sample-modal-complex',
		// 	name: 'Open sample modal (complex)',
		// 	checkCallback: (checking: boolean) => {
		// 		// Conditions to check
		// 		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		// 		if (markdownView) {
		// 			// If checking is true, we're simply "checking" if the command can be run.
		// 			// If checking is false, then we want to actually perform the operation.
		// 			if (!checking) {
		// 				new SampleModal(this.app).open();
		// 			}

		// 			// This command will only show up in Command Palette when the check function returns true
		// 			return true;
		// 		}
		// 	}
		// });

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new GistSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async uploadCurrentFileToGist() {
		const currentFile = this.app.workspace.getActiveFile();

		if (!currentFile) {
			return;
		}

		const fileName: string = currentFile.basename + "." + currentFile.extension;

		let octokit = await this.getOctokit();
		let fileContents = await this.app.vault.read(currentFile)

		let files: { [key: string]: any } = {};
		files[fileName] = { content: fileContents };

		let response = await octokit.rest.gists.create({
			files: files,
			public: false,
		});

		console.log(response);

		return response;
	}

	async getOctokit() {
		return new Octokit({
			baseUrl: this.settings.baseUrl,
			auth: this.settings.githubToken,
			userAgent: 'obsidian-note-to-gist v1',
		});
	}
}

class GistModal extends Modal {
	url: string;

	constructor(app: App, url: string) {
		super(app);

		this.url = url;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.setText('Gist Created');
		contentEl.createEl("br");
		contentEl.createEl("a", {
			text: "Click to open gist",
			href: this.url
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class GistSettingTab extends PluginSettingTab {
	plugin: GistPlugin;

	constructor(app: App, plugin: GistPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Note to Gist Settings' });

		new Setting(containerEl)
			.setName('GitHub Personal Access Token')
			.setDesc('Requires gist permission')
			.addText(text => text
				.setPlaceholder('GitHub Token')
				.setValue(this.plugin.settings.githubToken)
				.onChange(async (value) => {
					console.log('githubToken: ' + value);
					this.plugin.settings.githubToken = value;
					await this.plugin.saveSettings();
				}));
	}
}
