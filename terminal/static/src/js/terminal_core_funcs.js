// Copyright 2018-2019 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
odoo.define('terminal.CoreFunctions', function (require) {
    'use strict';

    var rpc = require('web.rpc');
    var session = require('web.session');
    var Terminal = require('terminal.Terminal').terminal;

    Terminal.include({
        init: function () {
            this._super.apply(this, arguments);

            this.registerCommand('help', {
                definition: 'Print this help or command detailed info',
                callback: this._printHelp,
                detail: 'Show commands and a quick definition.<br/>- ' +
                    '<> ~> Required Parameter<br/>- [] ~> Optional Parameter',
                syntaxis: '[STRING: COMMAND]',
                args: '?s',
            });
            this.registerCommand('alias', {
                definition: 'Create alias',
                callback: this._createAlias,
                detail: 'Create new alias.<br/>Can use "$1, $2, $n..." ' +
                    'for input parameters.<br/>Use "-d" in &lt;COMMAND&gt; ' +
                    'to delete alias.',
                syntaxis: '<STRING: NAME> <STRING: COMMAND>',
                args: 'ss',
            });
        },

        _createAlias: function (params) {
            var name = params[0];
            var code = params[1];
            var self = this;

            var existsCmd = _.some(_.keys(this._registeredCmds),
                function (item) {
                    return item.toLowerCase() === name.toLowerCase();
                });
            if (existsCmd) {
                var defer_error = $.Deferred(function (d) {
                    d.reject("Invalid alias name");
                });
                return $.when(defer_error);
            }

            return rpc.query({
                method: 'search_read',
                domain: [['name', '=', name]],
                model: 'terminal.alias',
                fields: ['id'],
                kwargs: {context: session.user_context},
            }).then(function (results) {
                if (code === '-d') {
                    if (results.length) {
                        return rpc.query({
                            method: 'unlink',
                            model: 'terminal.alias',
                            args: [results[0].id],
                            kwargs: {context: session.user_context},
                        }).then(function () {
                            self.print(_.template("'<%= alias %>' alias " +
                                "deleted successfully")({alias:name}));
                        });
                    }
                    self.print(_.template("[!] '<%= alias %>' alias "+
                        "doesn't exists!")({alias:name}));
                } else if (results.length) {
                    return rpc.query({
                        method: 'write',
                        model: 'terminal.alias',
                        args: [results[0].id, {command:code}],
                        kwargs: {context: session.user_context},
                    }).then(function () {
                        self.print(_.template("'<%= alias %>' alias updated " +
                            "successfully")({alias:name}));
                    });
                } else {
                    return rpc.query({
                        method: 'create',
                        model: 'terminal.alias',
                        args: [{name:name, command:code}],
                        kwargs: {context: session.user_context},
                    }).then(function () {
                        self.print(_.template("'<%= alias %>' alias created " +
                            "successfully")({alias:name}));
                    });
                }
            });
        },

        _printHelp: function (params) {
            if (!params || params.length === 0) {
                var sortedCmdKeys = _.keys(this._registeredCmds).sort();
                for (var index in sortedCmdKeys) {
                    var cmdDef = this._registeredCmds[sortedCmdKeys[index]];
                    this._printHelpSimple(sortedCmdKeys[index], cmdDef);
                }
            } else {
                var cmd = params[0];
                if (Object.prototype.hasOwnProperty.call(this._registeredCmds,
                    cmd)) {
                    this._printHelpDetailed(cmd, this._registeredCmds[cmd]);
                } else {
                    this.print(_.template(
                        "[!] '<%= cmd %>'' command doesn't exists")({cmd:cmd}));
                }
            }

            return $.when();
        },

        _printHelpSimple: function (cmd, cmdDef) {
            this.print(_.template("<strong class='o_terminal_click " +
                "o_terminal_cmd' data-cmd='help <%= cmd %>'><%= cmd %>" +
                "</strong> - <i><%= def %></i>")({
                cmd:cmd,
                def:cmdDef.definition,
            }));
        },

        _printHelpDetailed: function (cmd, cmdDef) {
            this.print(cmdDef.detail);
            this.print(" ");
            this.eprint(_.template("Syntaxis: <%= cmd %> <%= syntax %>")({
                cmd:cmd,
                syntax:cmdDef.syntaxis,
            }));
        },


        _printWelcomeMessage: function () {
            this._super.apply(this, arguments);
            this.print("Type '<i class='o_terminal_click o_terminal_cmd' " +
                "data-cmd='help'>help</i>' or '<i class='o_terminal_click " +
                "o_terminal_cmd' data-cmd='help help'>help " +
                "&lt;command&gt;</i>' to start.");
        },
    });

});
