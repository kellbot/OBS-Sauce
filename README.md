![Sauce OBS Overlay](https://i.imgur.com/RUB6iOZ.png)
# Sauce for Zwift OBS Overlay
This is a mod which provides a data overlay for Zwift streaming. It is designed to work with OBS but may work with other software as well. It requires a paid subscription to [Sauce for Zwift](https://www.patreon.com/bePatron?u=32064618 ) in order to work.
It is set up to work at a resolution of 1920 x 1080.


## Installation

### Zip Installation
* Create a folder titled SauceMods within your documents folder. For example: `C:\Users\Yourname\Documents\SauceMods`
* Unzip this mod into a subfolder within, the name is not important. For example `C:\Users\Yourname\Documents\SauceMods\obs-sauce`

### Github installation (advanced users)
If you want to easily update the mod or try experimental features you can clone the git repository.
* [Install a git client for your operating system](https://github.com/git-guides/install-git)
* [Clone this repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository) into your SauceMods folder
* Update the mod by opening a command prompt, navigating to the mod folder, and typing `git pull origin main` 

## Tools
### Overlay
This is the browser source for OBS, and cannot be added as a widget by itself. It is designed to be used at 1920 x 1080.

### Team Rosters
You can optionally filter the nearby riders list by a pre-configured list of riders. This is helpful if you race with multiple teams and don't want to mark / unmark everyone for each race. To set up a team open the server URL in a browser window, then click "Settings" under OBS. Click "Create team" and enter a team name followed by a list of comma delimited Zwift ID numbers (`123, 1235, 6543, 1235`); Then select that team from the dropdown menu. When `TTT mode` is selected in settings the roster will be filtered by this list.

## Windows
### Course Notes
This is a sauce widget you can use to display course notes along the route during events. You can set these up by editing `pages/ds-notes.mjs`. Each course is its own entry in the `dsNotes` constant. Use the route ID as the object key for the course notes.

### Desert Bus
"Play" the world's worst game while you Zwift!

### Settings
These settings only affect the Sauce widget windows, not anything within OBS (which has its own settings instance).


## Configuration
* Start sauce
* Open Sauce's settings by clicking on the gear icon in the Sauce toolbar. Click on the "Windows" tab and scroll down until you see the mod. Click the checkbox to enable it. You may need to restart Sauce.
* Open the settings again and click on the URL of the server (most likely with a bunch of numbers in it). Click the link to open it in a new browser window. Scroll down and click on either "OBS Overlay" or "Desert Bus." Copy the URL of the resulting page.
* Create a new [Browser source](https://obsproject.com/kb/browser-source) in OBS. Enter the URL from the previous step.
* Set the width and height to 1920 and 1080, respectively.
* Once you start Zwift your data should show up on screen.
* Configure the mod options by clicking "Interact" in OBS and then right-clicking anywhere on the screen to bring up the toolbar. Click the gear icon to go to the settings page. **Note: this will be visible on stream!**
* Alternately, if yo have [Source dock](https://obsproject.com/forum/resources/source-dock.1317/) installed you can create a separate source for the settings panel and dock it to OBS
