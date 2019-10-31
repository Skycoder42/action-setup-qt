export function generateScript(path: string, version: string, platform: string, packages: string) {
	const qtVer: string = version.replace(/\./g, "")
	let modules = [`qt.qt5.${qtVer}.${platform}`];
	for (let entry of packages.split(","))
		modules.push(`qt.qt5.${qtVer}.${entry}`);
	if (platform == "win64_mingw73")
		modules.push("qt.tools.win64_mingw73");
	if (platform == "win32_mingw73")
		modules.push("qt.tools.win32_mingw73");
	return `// http://stackoverflow.com/questions/25105269/silent-install-qt-run-installer-on-ubuntu-server

	function Controller() {
		installer.autoRejectMessageBoxes();
		installer.installationFinished.connect(function() {
			gui.clickButton(buttons.NextButton, 1000);
		});
	}

	// Skip the welcome page
	Controller.prototype.WelcomePageCallback = function() {
		gui.clickButton(buttons.NextButton, 3000);
	}

	// skip the Qt Account credentials page
	Controller.prototype.CredentialsPageCallback = function() {
		gui.clickButton(buttons.NextButton, 1000);
	}

	// skip the introduction page
	Controller.prototype.IntroductionPageCallback = function() {
		gui.clickButton(buttons.NextButton, 1000);
	}

	// skip the telemetry page
	Controller.prototype.DynamicTelemetryPluginFormCallback = function() {
		gui.pageWidgetByObjectName("DynamicTelemetryPluginForm").statisticGroupBox.disableStatisticRadioButton.setChecked(true);
		gui.clickButton(buttons.NextButton, 1000);
	}

	// set the installation target directory
	Controller.prototype.TargetDirectoryPageCallback = function() {
		gui.currentPageWidget().TargetDirectoryLineEdit.setText("${path}");
		gui.clickButton(buttons.NextButton, 0);
		console.log(gui.currentPageWidget().TargetDirectoryLineEdit.text());
		console.log(gui.currentPageWidget().WarningLabel.text());
		gui.clickButton(buttons.NextButton, 1000);
	}

	// select the components to install
	Controller.prototype.ComponentSelectionPageCallback = function() {
		var widget = gui.currentPageWidget();
		widget.deselectAll();
		var groupBox = gui.findChild(widget, "CategoryGroupBox");
		gui.findChild(groupBox, "LTS").setChecked(true);
		gui.findChild(groupBox, "Latest releases").setChecked(true);
		gui.findChild(groupBox, "FetchCategoryButton").click();
		widget.deselectAll();
		var extraMods = ["${modules.join("\", \"")}"];
		extraMods.forEach(function(element){
			widget.selectComponent(element);
		});

		gui.clickButton(buttons.NextButton, 1000);
	}

	// accept the license agreement
	Controller.prototype.LicenseAgreementPageCallback = function() {
		gui.currentPageWidget().AcceptLicenseRadioButton.setChecked(true);
		gui.clickButton(buttons.NextButton, 1000);
	}

	// leave the start menu as it is
	Controller.prototype.StartMenuDirectoryPageCallback = function() {
		gui.clickButton(buttons.NextButton, 1000);
	}

	// install
	Controller.prototype.ReadyForInstallationPageCallback = function() {
		gui.clickButton(buttons.NextButton, 1000);
	}

	// install
	Controller.prototype.PerformInstallationPageCallback = function() {
		gui.clickButton(buttons.NextButton, 1000);
	}

	Controller.prototype.FinishedPageCallback = function() {
		// do not launch QtCreator
		var checkBoxForm = gui.currentPageWidget().LaunchQtCreatorCheckBoxForm
		if (checkBoxForm && checkBoxForm.launchQtCreatorCheckBox)
			checkBoxForm.launchQtCreatorCheckBox.checked = false;
		gui.clickButton(buttons.FinishButton, 1000);
	}
	`;
}
