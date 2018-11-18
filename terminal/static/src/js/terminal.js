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
  var Class = require('web.Class');


  var ParameterReader = Class.extend({
    INPUT_GROUP_DELIMETERS: ['"', "'"],

    parse: function(strParams) {
      var scmd = strParams.split(' ');
      scmd = _.filter(scmd, function(item){ return item; });

      var c_group = [false, false];
      var mdeli = '';
      var params = [];
      for (var i in scmd) {
        var startChar = scmd[i].charAt(0);
        var endChar = scmd[i].charAt(scmd[i].length-1);
        if (c_group[0] === false && this.INPUT_GROUP_DELIMETERS.indexOf(startChar) !== -1) {
          c_group[0] = i;
          mdeli = startChar;
        }
        if (c_group[0] !== false && endChar === mdeli) {
          c_group[1] = i;
        }

        if (c_group[0] !== false && c_group[1] !== false) {
          scmd[c_group[0]] = scmd[c_group[0]].slice(1);
          scmd[c_group[1]] = scmd[c_group[1]].slice(0, scmd[c_group[1]].length-1);
          params.push(this._sanitizeString(_.clone(scmd).splice(c_group[0], (c_group[1]-c_group[0])+1).join(' ')));
          c_group[0] = false;
          c_group[1] = false;
        } else if (c_group[0] === false && c_group[1] === false) {
          params.push(this._sanitizeString(scmd[i]));
        }
      }

      return params;
    },

    _sanitizeString: function(str) {
      return str.replace(new RegExp("['\"]", 'g'), '\"');
    },
  });

  var ParameterChecker = Class.extend({
    _validators: {},

    init: function() {
      this._validators['s'] = this._validateString;
      this._validators['i'] = this._validateInt;
    },

    validate: function(args, params) {
      var curParamIndex = 0;
      for (var i=0; i < args.length; ++i) {
        var carg = args[i];
        var optional = false;
        if (carg === '?') {
          optional = true;
          carg = args[++i];
        }

        if ((!optional && curParamIndex >= params.length) ||
            (curParamIndex < params.length && !this._validators[carg](params[curParamIndex]))) {
          return false;
        }

        ++curParamIndex;
      }

      return (!curParamIndex || params.length <= curParamIndex);
    },

    _validateString: function(param) {
      return (+param !== parseInt(param, 10));
    },
    _validateInt: function(param) {
      return (+param === parseInt(param, 10));
    },
  });

  var Terminal = Widget.extend({
    events: {
      "keypress #terminal_input": "_onInputKeyPress",
      "click #terminal_button": "_processInputCommand",
      "click #terminal_screen": "_preventLostInputFocus",
      "click .o_terminal_cmd": "_onClickTerminalCommand",
    },
    VERSION: '0.1.0',

    _registeredCmds: {},
    _inputHistory: [],
    _searchCommandIter: 0,
    _searchCommandQuery: '',
    _searchHistoryIter: 0,

    _parameterChecker: null,
    _parameterReader: null,

    /* INITIALIZE */
    init: function(parent) {
      this._super.apply(this, arguments);

      this._parameterChecker = new ParameterChecker();
      this._parameterReader = new ParameterReader();
    },

    start: function() {
      this._super.apply(this, arguments);

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
      var scmd = this._parameterReader.parse(cmd);
      if (this._registeredCmds.hasOwnProperty(scmd[0])) {
        var cmdDef = this._registeredCmds[scmd[0]];
        var params = scmd.slice(1);
        if (this._parameterChecker.validate(cmdDef.args, params)) {
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
        return item.indexOf(self._searchCommandQuery) === 0;
      });

      if (!matchCmds.length) {
        this._searchCommandIter = 0;
        return false;
      }
      else if (this._searchCommandIter >= matchCmds.length) {
        this._searchCommandIter = 0;
      }
      return matchCmds[this._searchCommandIter++];
    },

    _processInputCommand: function() {
      var cmd = this.$input.val();
      if (cmd) {
        var self = this;
        self.$input.append(_.template("<option><%= cmd %></option>")({cmd:cmd}));
        self.eprint(_.template("> <%= cmd %>")({cmd:cmd}));
        this._inputHistory.push(cmd);
        this.cleanInput();
        this.executeCommand(cmd);
      }
      this._preventLostInputFocus();
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
      core.bus.on('toggle_terminal', this, function() {
        this.terminal.do_toggle();
      });

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
