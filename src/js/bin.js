define(['system'], function (defaultSystem) {

    function getArgument(args, index) {
        if (args.length < index + 1) {
            throw new Error('missing operand');
        }
        return args[index];
    }

    function prepareCreation(fs, path, type, context) {
        var creation = {}, dirs;
        dirs = fs.parsePath(path);
        creation.filename = dirs.pop();
        creation.parent = dirs.length ? fs.get(dirs.join('/')) : context.directory;
        if (!creation.parent) {
            throw new Error(`cannot create ${type} '${path}': No such file or directory`);
        }
        return creation;
    }

    function printWorkingDirectory(sys) {
        return sys.context.directory.path;
    }

    function whoAmI(sys) {
        return sys.context.user.name;
    }

    function clear() {
        /*global j$*/
        j$.terminal.init();
    }

    function listFiles(sys, args) {
        let [fs, context] = [sys.fs, sys.context];
        var files = '', dir;
        if (args.length < 2) {
            dir = context.directory;
        } else {
            dir = fs.get(args[1], context.directory);
        }
        dir.list().forEach(crt => {
            if (!crt.startsWith('.')) {
                files += crt + '\t';
            }
        });
        return files;
    }

    function makeDirectory(sys, args) {
        let [fs, context] = [sys.fs, sys.context];
        let path = getArgument(args, 1);
        if (fs.get(path)) {
            throw new Error(`cannot create directory '${path}': File exists`);
        }
        let creation = prepareCreation(fs, path, 'directory', context);
        fs.mkdir(creation.filename, creation.parent, context.user);
    }

    function touch(sys, args) {
        let [fs, context] = [sys.fs, sys.context];
        var creation = prepareCreation(fs, getArgument(args, 1), 'file', context);
        fs.touch(creation.filename, creation.parent, context.user);
    }

    function rm(sys, args) {
        let [fs, context] = [sys.fs, sys.context];
        var path = getArgument(args, 1),
            file = fs.get(path, context.directory);
        if (!file) {
            throw new Error(`cannot remove '${path}': No such file or directory`);
        }
        fs.rm(file.name, file.parent, context.user);
    }

    function cat(sys, args) {
        let [fs, context] = [sys.fs, sys.context];
        let path = getArgument(args, 1);
        let file = fs.get(path, context.directory);
        if (!file) {
            throw new Error(path + ': No such file or directory');
        }
        if (file.isDirectory) {
            throw new Error(path + ': Is a directory');
        }
        if (file.content instanceof Function) {
            throw new Error(path + ': Is a binary file');
        }
        return file.content;
    }

    function init(sys = defaultSystem) {
        let [fs, auth] = [sys.fs, sys.auth];
        let [root, bin, usrBin] = [auth.root, fs.get('/bin'), fs.get('/usr/bin')];

        fs.touch('pwd', bin, root, printWorkingDirectory.bind(null, sys));
        fs.touch('ls', bin, root, listFiles.bind(null, sys));
        fs.touch('mkdir', bin, root, makeDirectory.bind(null, sys));
        fs.touch('touch', bin, root, touch.bind(null, sys));
        fs.touch('rm', bin, root, rm.bind(null, sys));
        fs.touch('whoami', usrBin, root, whoAmI.bind(null, sys));
        fs.touch('clear', usrBin, root, clear.bind(null, sys));
        fs.touch('cat', bin, root, cat.bind(null, sys));
    }

    return { init };

});
