// Copyright 2018 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
odoo.define('terminal.Terminal', function(require) {
  'use strict';

  var core = require('web.core');
  var rpc = require('web.rpc');
  var session = require('web.session');
  var Widget = require('web.Widget');
  var WebClient = require('web.WebClient');
  var DebugManager = require('web.DebugManager');

  var Terminal = Widget.extend({
    events: {
      "keypress #terminal_input": "_onInputKeyPress",
      "click #terminal_button": "_processInputCommand",
      "click #terminal_screen": "_preventLostInputFocus",
      "click .o_terminal_cmd": "_onClickTerminalCommand",
    },
    VERSION: '0.3',
    INPUT_GROUP_DELIMETERS: ['"', "'"],

    _registeredCmds: {},
    _inputHistory: [],
    _searchCommandIter: 0,
    _searchCommandQuery: '',
    _searchHistoryIter: 0,

    /* INITIALIZE */
    init: function(parent) {
      this._super.apply(this, arguments);

      this.registerCommand('help', {
        definition: 'Print this help or command detailed info',
        function: this._printHelp,
        detail: 'Show commands and a quick definition.',
        syntaxis: '[COMMAND]',
        args: 's?',
      });
      this.registerCommand('alias', {
        definition: 'Create alias',
        function: this._createAlias,
        detail: 'Create new alias.<br/>Can use "$1, $2, $n..." for input parameters.',
        syntaxis: '<NAME> <COMMAND>',
        args: 'ss',
      });
    },

    start: function() {
      this.$input = this.$el.find('#terminal_input');
      this.$term = this.$el.find('#terminal_screen');
      this.$button = this.$el.find('#terminal_button');

      core.bus.on('keypress', this, this._onCoreKeyPress);
      core.bus.on('click', this, this._onCoreClick);

      this.clean();
      this.cleanInput();

      this.print(_.template("<strong style='color:rgb(124, 123, 173);'>Odoo Terminal v<%= ver %></strong>")({ver:this.VERSION}));
      this.print("Type '<i class='o_terminal_click o_terminal_cmd' data-cmd='help'>help</i>' or '<i class='o_terminal_click o_terminal_cmd' data-cmd='help help'>help &lt;command&gt;</i>' to start.");
      this.print(' ');
    },

    /* PRINT */
    print: function(msg, enl) {
      this.$term.append(`<span>${msg}</span>${(enl||typeof enl === 'undefined'?'<br/>':'')}`);
      this.$term[0].scrollTop = this.$term[0].scrollHeight;
    },

    eprint: function(msg, enl) {
      this.$term.append('<span>');
      this.$term.append(document.createTextNode(msg));
      this.$term.append(`</span>${(enl||typeof enl === 'undefined'?'<br/>':'')}`);
      this.$term[0].scrollTop = this.$term[0].scrollHeight;
    },

    /* BASIC FUNCTIONS */
    clean: function() {
      this.$term.html('');
    },

    cleanInput: function() {
      this.$input.val('');
    },

    registerCommand: function(cmd, cmdDef) {
      cmdDef.function = cmdDef.function.bind(this);
      this._registeredCmds[cmd] = cmdDef;
    },

    executeCommand: function(cmd) {
      var self = this;
      var scmd = this._sliceGroupInputParams(cmd);
      if (this._registeredCmds.hasOwnProperty(scmd[0])) {
        var cmdDef = this._registeredCmds[scmd[0]];
        var params = scmd.slice(1);
        if (this._checkCommandParameters(cmdDef, params)) {
          cmdDef.function(params).fail(function(emsg){
            emsg = emsg || "undefined error";
            self.eprint(_.template("[!] Error executing '<%= cmd %>': <%= error %>")({cmd:cmd, error:emsg}));
          });
        } else {
          this.print(_.template("<span class='o_terminal_click o_terminal_cmd' data-cmd='help <%= cmd %>'>[!] Invalid command parameters!</span>")({cmd:scmd[0]}));
        }
      } else {
        this._callAlias(scmd[0], scmd.slice(1));
      }
    },

    /* VISIBILIY */
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


    /* PRIVATE METHODS*/
    _doSearchCommand: function() {
      var self = this;
      var matchCmds = _.filter(_.keys(this._registeredCmds), function(item){
        console.log(self._searchCommandQuery + " --- " + item);
        console.log(item.indexOf(self._searchCommandQuery));
        return item.indexOf(self._searchCommandQuery) === 0;
      });

      console.log(matchCmds);

      if (!matchCmds.length) {
        this._searchCommandIter = 0;
        return false;
      }
      else if (this._searchCommandIter >= matchCmds.length) {
        this._searchCommandIter = 0;
      }
      return matchCmds[this._searchCommandIter++];
    },

    /* ALIAS COMMAND */
    _createAlias: function(params) {
      var name = params[0];
      var code = params[1];
      var self = this;

      return rpc.query({
        method: 'search_read',
        domain: [['name', '=', name]],
        model: 'terminal.alias',
        fields: ['id'],
        kwargs: {context: session.user_context},
      }).then(function(results){
        if (code === '-d') {
          if (results.length) {
            return rpc.query({
              method: 'unlink',
              model: 'terminal.alias',
              args: [results[0].id],
              kwargs: {context: session.user_context},
            }).then(function(result){
              self.print(_.template("'<%= alias %>' alias deleted successfully")({alias:name}));
            });
          } else {
            self.print(_.template("[!] '<%= alias %>' alias doesn't exists!")({alias:name}));
          }
        } else if (results.length) {
          return rpc.query({
            method: 'write',
            model: 'terminal.alias',
            args: [results[0].id, {command:code}],
            kwargs: {context: session.user_context},
          }).then(function(result){
            self.print(_.template("'<%= alias %>' alias updated successfully")({alias:name}));
          });
        } else {
          return rpc.query({
            method: 'create',
            model: 'terminal.alias',
            args: [{name:name, command:code}],
            kwargs: {context: session.user_context},
          }).then(function(result){
            self.print(_.template("'<%= alias %>' alias created successfully")({alias:name}));
          });
        }
      });
    },

    _callAlias: function(alias, params) {
      var self = this;
      return rpc.query({
        method: 'search_read',
        domain: [['name', '=', alias]],
        model: 'terminal.alias',
        fields: ['command'],
        kwargs: {context: session.user_context},
      }).then(function(results){
        if (results.length) {
          var cmd = results[0].command;
          for (var i in params) {
            console.log('$'+(+i+1));
            cmd = cmd.replace('$'+(+i+1), params[i]);
          }
          console.log(cmd);
          self.executeCommand(cmd);
        } else {
          self.print(_.template("[!] '<%= cmd %>' command not found")({cmd:alias}));
        }
      });
    },

    /* HELP COMMAND */
    _printHelp: function(params) {
      if (!params.length) {
        for (var cmd in this._registeredCmds) {
          var cmdDef = this._registeredCmds[cmd];
          this._printHelpSimple(cmd, cmdDef);
        }
      } else {
        var cmd = params[0];
        if (this._registeredCmds.hasOwnProperty(cmd)) {
          var cmdDef = this._registeredCmds[cmd];
          this._printHelpDetailed(cmd, cmdDef);
        } else {
          this.print(_.template("[!] '<%= cmd %>'' command doesn't exists")({cmd:cmd}));
        }
      }

      return $.when();
    },

    _printHelpSimple: function(cmd, cmdDef) {
      this.print(_.template("<strong class='o_terminal_click o_terminal_cmd' data-cmd='help <%= cmd %>'><%= cmd %></strong> - <i><%= def %></i>")({cmd:cmd, def:cmdDef.definition}));
    },

    _printHelpDetailed: function(cmd, cmdDef) {
      this.print(cmdDef.detail);
      this.print(" ");
      this.eprint(_.template("Syntaxis: <%= cmd %> <%= syntax %>")({cmd:cmd, syntax:cmdDef.syntaxis}));
    },

    /* HANDLE COMMANDS */
    _sliceGroupInputParams: function(cmd) {
      var scmd = cmd.split(' ');
      scmd = _.filter(scmd, function(item){ return item; });

      var founded = false;
      do {
        founded = false;
        var c_group = [false, false];
        var mdeli = '';
        for (var i in scmd) {
          var startChar = scmd[i].charAt(0);
          var endChar = scmd[i].charAt(scmd[i].length-1);
          if (!c_group[0] && this.INPUT_GROUP_DELIMETERS.indexOf(startChar) != -1) {
            c_group[0] = i;
            mdeli = startChar;
          }
          if (c_group[0] && endChar === mdeli) {
            c_group[1] = i;
          }

          if (c_group[0] !== false && c_group[1] !== false && c_group[0] !== c_group[1]) {
            scmd[c_group[0]] = scmd[c_group[0]].slice(1);
            scmd[c_group[1]] = scmd[c_group[1]].slice(0, scmd[c_group[1]].length-1);
            scmd.splice(c_group[0], 0, scmd.splice(c_group[0], c_group[1]).join(' '));
            founded = true;
            break;
          }
        }
      } while(founded);

      return scmd;
    },

    _checkCommandParameters: function(cmdDef, params) {
      var hasInvalidParams = false;
      if (cmdDef.args.length) {
        if (cmdDef.args.length === params.length ||
            (cmdDef.args.charAt(cmdDef.args.length-1) === '?' &&
              (cmdDef.args.length-2 === params.length || cmdDef.args.length-1 === params.length))) {
          for (var i=0; i<params.length; ++i) {
            var carg = cmdDef.args.charAt(i);
            if ((carg === 'i' && params[i] != parseInt(params[i], 10)) ||
                (carg === 's' && (params[i] == parseInt(params[i], 10) || !_.isString(params[i]))) ||
                (carg !== 'i' && carg !== 's')) {
              hasInvalidParams = true;
              break;
            }
          }
        } else {
          hasInvalidParams = true;
        }
      }

      return !hasInvalidParams;
    },

    _processInputCommand: function() {
      var cmd = this.$input.val();
      if (cmd) {
        var self = this;
        self.$input.append(_.template("<option><%= cmd %></option>")({cmd:cmd}));
        self.eprint(_.template("> <%= cmd %>")({cmd:cmd}));
        this._inputHistory.push(cmd);
        this._input
        this.cleanInput();
        this.executeCommand(cmd);
      }
      this.$input.focus();
    },

    /* HANDLE EVENTS */
    _preventLostInputFocus: function(ev) {
      this.$input.focus();
    },

    _onClickTerminalCommand: function(ev) {
      if (ev.target.dataset.hasOwnProperty('cmd')) {
        var cmd = ev.target.dataset.cmd;
        this.eprint(_.template("> <%= cmd %>")({cmd:cmd}));
        this.executeCommand(cmd);
      }
    },

    _onInputKeyPress: function(ev) {
      if (ev.keyCode === 13) { // Press Enter
        this._processInputCommand();
        this._searchHistoryIter = this._inputHistory.length;
      } else if (ev.keyCode === 38) { // Press Up
        if (this._searchHistoryIter > 0) {
          --this._searchHistoryIter;
          this.$input.val(this._inputHistory[this._searchHistoryIter]);
        }
      } else if (ev.keyCode === 40) { // Press Down
        if (this._searchHistoryIter < this._inputHistory.length-1) {
          ++this._searchHistoryIter;
          this.$input.val(this._inputHistory[this._searchHistoryIter]);
        } else {
          this._searchHistoryIter = this._inputHistory.length;
          this.cleanInput();
        }
      }
      if (ev.keyCode == 9) { // Press Tab
        if (this.$input.val()) {
          if (!this._searchCommandQuery) {
            this._searchCommandQuery = this.$input.val();
          }
          var found_cmd = this._doSearchCommand();
          if (found_cmd) {
            this.$input.val(found_cmd + ' ');
          }
        }
        ev.preventDefault();
      } else {
        this._searchCommandIter = 0;
        this._searchCommandQuery = false;
      }
    },

    _onCoreClick: function(ev) {
      // Auto-Hide
      if (!this.$el[0].contains(ev.target)) {
        this.do_hide();
      }
    },
    _onCoreKeyPress: function(ev) {
      if (ev.keyCode === 112) { // Press F1
        this.do_toggle();
      }
    },
  });

  /* Instantiate Terminal */
  WebClient.include({
    terminal: null,

    show_application: function () {
      this.terminal = new Terminal(this);
      this.terminal.setElement(this.$el.parents().find('#terminal'));
      this.terminal.start();
      core.bus.on('toggle_terminal', this, (function() {
        this.terminal.do_toggle();
      }).bind(this));

      return this._super.apply(this, arguments);
    },
  });

  /* Debug Menu Entry Action */
  DebugManager.include({
    toggle_terminal: function(ev) {
      // HOT-FIX: Prevent hide terminal dispatched by an "outside click event"
      _.defer(function(){ core.bus.trigger_up('toggle_terminal'); });
    },
  })

  return Terminal;
});
