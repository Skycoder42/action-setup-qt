var Downloader = require('../lib/downloader');
var Extractor = require('../lib/extractor');
var VersionNumber = require('../lib/versionnumber');

var version = new VersionNumber.default(5, 14, 0);
var platform = "gcc_64";
var dl = new Downloader.default("linux", "x64", version, platform);
var ex = new Extractor.default("/tmp/tst-setup-qt/install", version, platform);
dl.addQtSource()
    .then(() => dl.addSource(new URL("https://install.skycoder42.de/qtmodules/"), false))
    .then(() => {
        console.log(dl.modules());
        dl.addDownload('qtnetworkauth', true);
        dl.addDownload('qtvirtualkeyboard', true);
        dl.addDownload('qtlottie', true);
        dl.addDownload('skycoder42.service', true);
        //dl.addDownload('skycoder42.jsonserializer', true);
        //dl.addDownload('skycoder42.restclient', true);
        dl.addDownload('qtwaylandcompositor', false);
        dl.addDownload('qtwebengine', false);
        dl.addDownload('qtwebglplugin', false);
        return dl.download();
    })
    .then(archives => ex.extractAll(archives))
    .then(() => console.log("DONE!"))
    .catch(e => console.log(e));
