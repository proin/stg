'use strict';

((app)=> {
    const fs = require('fs');
    const path = require('path');
    const fsext = require('fs-extra');

    const AV = require('av');
    require('flac.js');

    const os = require('os');

    let decoder = function () {
        let on = {};

        let configuration = {};
        configuration.DUMP_SIZE = 1024 * 512;

        this.start = (source)=> {
            let assetInfo = AV.Asset.fromFile(source);
            let asset = AV.Asset.fromFile(source);
            let result = [];
            let dump = [];

            let mediaFormat = {};

            assetInfo.get('format', function (format) {
                mediaFormat = format;
            });

            asset.on('data', function (buffer) {
                for (let i = 0; i < buffer.length; i++) {
                    dump.push(buffer[i]);
                    if (dump.length >= configuration.DUMP_SIZE) {
                        result.push(true);
                        if (on.data) on.data(dump, mediaFormat, result.length);
                        dump = [];
                    }
                }
            });

            asset.on('end', ()=> {
                if (dump.length < configuration.DUMP_SIZE) {
                    result.push(true);
                    if (on.data) on.data(dump, mediaFormat, result.length);
                    dump = [];
                }

                if (on.end) on.end(result);
            });

            asset.start();

            return this;
        };

        this.set = (name, value)=> {
            configuration[name] = value;
            return this;
        };

        this.on = (name, binding)=> {
            on[name] = binding;
            return this;
        };
    };

    app.graph = (opts)=> new Promise((resolve)=> {
        let {file, output, onRead} = opts;
        let decode = new decoder();

        const FILE = file;
        const OUTPUT_ROOT = path.resolve(output, path.basename(FILE, path.extname(FILE)));

        try {
            fsext.removeSync(OUTPUT_ROOT);
            fsext.mkdirsSync(OUTPUT_ROOT);
        } catch (e) {
        }

        decode
            .set('DUMP_SIZE', 1024 * 512)
            .on('data', (buffer, format, bufferIdx)=> {
                if (onRead) onRead(buffer, format, bufferIdx);

                let graphSavePath = path.resolve(OUTPUT_ROOT, `graph_${bufferIdx.toLocaleString('en-US', {minimumIntegerDigits: 5, useGrouping: false})}.html`);

                let graphSrc = [];
                for (let i = 0; i < buffer.length; i++) graphSrc.push({x: i, y: buffer[i]});
                let html = fs.readFileSync(path.resolve(__dirname, 'res', 'vis.html'), 'utf-8');
                let startTime = Math.round(1024 * 512 / 2 / format.sampleRate * (bufferIdx - 1));
                let endTime = Math.round(1024 * 512 / 2 / format.sampleRate * (bufferIdx));
                html = html.replace('$time', `time: ${startTime}s ~ ${endTime}s`);
                html = html.replace('$items', JSON.stringify(graphSrc));
                fs.writeFileSync(graphSavePath, html);
            })
            .on('end', ()=> {
                resolve();
            })
            .start(FILE);
    });
})(module.exports);