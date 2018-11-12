odoo.define('terminal', function(require) {
  'use strict';

  var rpc = require('web.rpc');
  var core = require('web.core');
  var Widget = require('web.Widget');
  var WebClient = require('web.WebClient');

  var qweb = core.qweb;

  var Terminal = Widget.extend({
    registeredCmds: {},
    _version: '0.1a',

    init: function() {
      this._super.apply(this, arguments);

      this.$el = $('.o_terminal');
      this.$input = $('#terminal_input');
      this.$textarea = $('#terminal_textarea');
      this.$button = $('#terminal_button');

      this._registerCommand('help', this._printHelp);
      this._registerCommand('clean', this.clean);
      this._registerCommand('print', this._printMessage);
      this._registerCommand('create', this._createModelRecord);
      this._registerCommand('view', this._viewModelRecord);
      this._registerCommand('search', this._searchModelRecord);
      this._registerCommand('upgrade', this._upgradeModule);

      this.clean();
      this.addMessage(`Odoo Terminal v${this._version}`);
      this.addMessage("Type 'help' to start.");
      this.addMessage(' ');

      this.$button.on('click', this._processInputCommand.bind(this));
      this.$input.on('keydown', this._onInputKeyDown.bind(this));
      core.bus.on('keydown', this, this._onKeyDown);
      //core.bus.on('keyup', this, this.redirectKeyPresses);
      //core.bus.on('keypress', this, this.redirectKeyPresses);
    },

    addMessage: function(msg, enl) {
      this.$textarea.val(`${this.$textarea.val()}${msg}${(enl||typeof enl === 'undefined'?'\n':'')}`);
      this.$textarea[0].scrollTop = this.$textarea[0].scrollHeight;
    },

    cleanInput: function() {
      this.$input.val('');
    },

    clean: function() {
      this.$textarea.val('');
    },

    do_show: function() {
      this.$el.animate({
        top: '0',
      });
      this.$input.focus();
    },

    do_hide: function() {
      this.$el.animate({
        top: '-100%',
      });
    },

    do_toggle: function() {
      if (this.$el.css('top') === '0px') {
        this.do_hide();
      } else {
        this.do_show();
      }
    },

    _printHelp: function() {
      this.addMessage("- Avaliable Commands:");
      for (var cmd in this.registeredCmds) {
        this.addMessage(`${cmd}, `, false);
      }
      this.addMessage('');
    },

    _registerCommand: function(cmd, callback) {
      this.registeredCmds[cmd] = callback.bind(this);
    },

    _executeCommand: function(cmd) {
      var scmd = cmd.split(' ');
      if (this.registeredCmds.hasOwnProperty(scmd[0])) {
        return this.registeredCmds[scmd[0]](scmd.slice(1));
      }

      this.addMessage(`[!] '${scmd[0]}' command not found`);
      return $.Deferred();
    },

    _printMessage: function(params) {
      var self = this;
      return $.Deferred(function(defer) {
        self.addMessage(eval(params.join(' ')));
      }).promise();
    },

    _searchModelRecord: function(params) {
      var model = params[0];
      var fields = params[1]==='*'?false:params[1].split(',');
      var domain = eval(params.slice(2).join(' '));
      var self = this;
      return rpc.query({
        method: 'search_read',
        domain: domain,
        fields: fields,
        model: model,
      }).then(function(result){
        for (var record of result)
        {
          self.addMessage(`${record.id}. `, false);
          delete record['id'];
          for (var field in record) {
            self.addMessage(`${field}: ${record[field]}, `, false);
          }
          self.addMessage(' ');
        }
      });
    },

    _upgradeModule: function(params) {
      var module = params[0];
      var self = this;
      return rpc.query({
        method: 'search_read',
        domain: [['name', '=', module]],
        fields: ['name'],
        model: 'ir.module.module',
      }).then(function(result){
        if (result.length) {
          rpc.query({
            method: 'button_immediate_upgrade',
            model: 'ir.module.module',
            args: [result[0].id],
          }).then(function(){
            self.addMessage(`'${module}' module successfully upgraded`);
          }).fail(function(){
            self.addMessage(`[!] Can't upgrade '${module}' module`);
          });
        } else {
          self.addMessage(`[!] '${module}' module doesn't exists`);
        }
      });
    },

    _viewModelRecord: function(params) {
      var model = params[0];
      var self = this;
      console.log(+params[1]);
      return this.do_action({
          type: 'ir.actions.act_window',
          res_model: model,
          res_id: (params.length < 2)?false:+params[1],
          views: [[false, (params.length < 2)?'list':'form']],
          target: 'new',
      }).then(function(){
        self.do_hide();
      });
    },

    _createModelRecord: function(params) {
      var model = params[0];
      var self = this;
      return this.do_action({
          type: 'ir.actions.act_window',
          res_model: model,
          views: [[false, 'form']],
          target: 'current',
      }).then(function(){
        self.do_hide();
      });
    },

    _processInputCommand: function() {
      var cmd = this.$input.val();
      if (cmd) {
        var self = this;
        self.addMessage(cmd);
        this._executeCommand(cmd).then(function(){
          self.cleanInput();
        }).then(function(){
          // TODO
        }).fail(function(){
          self.addMessage(`[!] Error executing '${cmd}'`);
        });
      }
      this.$input.focus();
    },

    _onInputKeyDown: function(ev) {
      if (ev.keyCode === 13) {
        this._processInputCommand();
      }
    },
    _onKeyDown: function(ev) {
      if (ev.altKey && ev.keyCode === 113) {
        this.do_toggle();
      }
    },
  });

  WebClient.include({
    start: function () {
      this._super.apply(this, arguments);
      new Terminal(this);
    }
  });

  return Terminal;
});
