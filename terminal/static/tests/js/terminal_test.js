/* global QUnit */
/* Copyright 2019 Alexandre Díaz - <dev@redneboa.es>
 * License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl). */

odoo.define('terminal.test', function (require) {
    'use strict';

    var Terminal = require('terminal.Terminal').terminal;


    QUnit.module('terminal', {
        beforeEach: function () {
            var $el = $('<div id="terminal" class="o_terminal">' +
                '<div class="col-sm-12 col-lg-12" ' +
                'id="terminal_screen" readonly="readonly"></div>' +
                '<input type="edit" class="col-sm-11 col-lg-11" ' +
                'id="terminal_input" />' +
                '<input class="col-sm-1 col-lg-1" type="button" ' +
                'id="terminal_button" value="Send" />' +
            '</div>');

            this.document = $("#qunit-fixture");
            this.document.append($el);

            this.terminal = new Terminal(this);
            this.terminal.$el = $el;
            this.terminal.start();
        },
    });

    QUnit.test('It should set initialized after success init',
        function (assert) {
            assert.expect(1);

            assert.ok(this.terminal.executeCommand('help'));
        }
    );

    QUnit.test('Register new basic command',
        function (assert) {
            assert.expect(1);

            this.terminal.registerCommand('foo', {
                definition: 'This is a test',
                callback: function () {
                    return $.when($.Deferred(function (d) {
                        d.resolve();
                    }));
                },
                detail: '',
                syntaxis: '',
                args: '',
            });

            assert.ok(this.terminal.executeCommand('foo'));
        }
    );

    QUnit.test('Register new command with arguments',
        function (assert) {
            assert.expect(5);

            this.terminal.registerCommand('foo', {
                definition: 'This is a test',
                callback: function () {
                    return $.when($.Deferred(function (d) {
                        d.resolve();
                    }));
                },
                detail: '',
                syntaxis: '',
                args: 's?i',
            });

            assert.notOk(this.terminal.executeCommand('foo'));
            assert.notOk(this.terminal.executeCommand('foo 123'));
            assert.notOk(this.terminal.executeCommand('foo 123 paramB'));
            assert.ok(this.terminal.executeCommand('foo paramA'));
            assert.ok(this.terminal.executeCommand('foo paramA 123'));
        }
    );
});
