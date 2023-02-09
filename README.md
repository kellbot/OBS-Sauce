# Sauce for Zwift OBS Overlay
This is a mod which provides a data overlay for Zwift streaming. It is designed to work with OBS but may work with other software as well. It requires a paid subscription to [Sauce for Zwift](https://www.patreon.com/bePatron?u=32064618 ) in order to work.
It is set up to work at a resolution of 1920 x 1080.


## Installation
* Create a folder titled SauceMods within your documents folder. For example: `C:\Users\Yourname\Documents\SauceMods`
* Unzip this mod into a subfolder within, the name is not important. For example `C:\Users\Yourname\Documents\SauceMods\obs-sauce`

## Configuration
* Start sauce
* Open Sauce's settings by clicking on the gear icon in the Sauce toolbar. Make a note of the Web Server URL listed, which will likely have a string of numbers in it. Next, click on the "Windows" tab and scroll down until you see the mod. Click the checkbox to enable it. You may need to restart Sauce.
* Create a new [Browser source](https://obsproject.com/kb/browser-source) in OBS. In the URL field enter your Web Server URL from before, followed by `mods/obs/pages/overlay.html`
* Set the width and height to 1920 and 1080, respectively
* Once you start Zwift your data should show up on screen.