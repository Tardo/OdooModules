// Copyright 2018 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
odoo.define('terminal.Terminal', function(require) {
  'use strict';

  var core = require('web.core');
  var Widget = require('web.Widget');
  var WebClient = require('web.WebClient');
  var DebugManager = require('web.DebugManager');

  var Terminal = Widget.extend({
    events: {
      "keypress #terminal_input": "_onInputKeyPress",
      "click #terminal_button": "_processInputCommand",
      "click #terminal_screen": "_preventLostInputFocus",
    },
    VERSION: '0.1a',
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
        detail: 'Show commands and a quick definition',
        syntaxis: '[COMMAND]',
        args: 's?',
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

      this.print(_.template("Odoo Terminal v<%= ver %>")({ver:this.VERSION}));
      this.print("Type 'help' to start.");
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
          return item.indexOf(self._searchCommandQuery) === 0;
      });

      ++this._searchCommandIter;
      if (!matchCmds.length) {
        this._searchCommandIter = 0;
        return false;
      }
      else if (this._searchCommandIter >= matchCmds.length) {
        this._searchCommandIter = matchCmds.length-1;
      }
      return matchCmds[this._searchCommandIter];
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
      this.print(_.template("<%= cmd %> - <%= def %>")({cmd:cmd, def:cmdDef.definition}));
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

    _executeCommand: function(cmd) {
      var scmd = this._sliceGroupInputParams(cmd);
      if (this._registeredCmds.hasOwnProperty(scmd[0])) {
        var cmdDef = this._registeredCmds[scmd[0]];
        var params = scmd.slice(1);
        if (this._checkCommandParameters(cmdDef, params)) {
          return cmdDef.function(params);
        }

        this.print("[!] Invalid command parameters!");
        return $.when();
      }

      this.eprint(_.template("[!] '<%= cmd %>' command not found")({cmd:scmd[0]}));
      return $.when();
    },

    _processInputCommand: function() {
      var cmd = this.$input.val();
      if (cmd) {
        var self = this;
        self.$input.append(_.template("<option><%= cmd %></option>")({cmd:cmd}));
        self.eprint(_.template("> <%= cmd %>")({cmd:cmd}));
        this._inputHistory.push(cmd);
        this._executeCommand(cmd).then(function(){
          self.cleanInput();
        }).fail(function(){
          self.eprint(_.template("[!] Error executing '<%= cmd %>'")({cmd:cmd}));
        });
      }
      this.$input.focus();
    },

    /* HANDLE EVENTS */
    _preventLostInputFocus: function(ev) {
      this.$input.focus();
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
          var found_cmd = this._doSearchCommand();
          if (found_cmd) {
            this.$input.val(found_cmd + ' ');
          }
        }
        ev.preventDefault();
      } else {
        this._searchCommandIter = 0;
        this._searchCommandQuery = this.$input.val();
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
