// Copyright 2018 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
odoo.define('terminal.BasicFunctions', function(require) {
  'use strict';

  var rpc = require('web.rpc');
  var session = require('web.session');
  var Terminal = require('terminal.Terminal');

  Terminal.include({
    init: function() {
      this._super.apply(this, arguments);

      this.registerCommand('clean', {
        definition: 'Clean terminal',
        function: this._clean,
        detail: '',
        syntaxis: '',
        args: '',
      });
      this.registerCommand('print', {
        definition: 'Print a message',
        function: this._printEval,
        detail: 'Evail parameters and print the result',
        syntaxis: '<MSG>',
        args: '',
      });
      this.registerCommand('create', {
        definition: 'Create new record',
        function: this._createModelRecord,
        detail: 'Open new model record in form view or directly',
        syntaxis: '<MODEL NAME> [VALUES]',
        args: 'ss?',
      });
      this.registerCommand('unlink', {
        definition: 'Unlink record',
        function: this._unlinkModelRecord,
        detail: 'Delete a record',
        syntaxis: '<MODEL NAME> <RECORD ID>',
        args: 'si',
      });
      this.registerCommand('write', {
        definition: 'Update record values',
        function: this._writeModelRecord,
        detail: 'Update record values',
        syntaxis: '<MODEL NAME> <RECORD ID> <NEW VALUES>',
        args: 'sis',
      });
      this.registerCommand('view', {
        definition: 'View model record/s',
        function: this._viewModelRecord,
        detail: 'Open model record in form view or record in list view',
        syntaxis: '<MODEL NAME> [RECORD ID]',
        args: 'si?',
      });
      this.registerCommand('search', {
        definition: 'Search model record/s',
        function: this._searchModelRecord,
        detail: 'Launch orm search query<br/>Fields are separated by commas.',
        syntaxis: '<MODEL NAME> <FIELDS> [DOMAIN]',
        args: 'sss?',
      });
      this.registerCommand('upgrade', {
        definition: 'Upgrade a module',
        function: this._upgradeModule,
        detail: 'Launch upgrade module process',
        syntaxis: '<MODULE NAME>',
        args: 's',
      });
      this.registerCommand('settings', {
        definition: 'Open settings page',
        function: this._openSettings,
        detail: 'Open settings page',
        syntaxis: '',
        args: '',
      });
      this.registerCommand('reload', {
        definition: 'Reload current page',
        function: this._reloadPage,
        detail: 'Reload current page',
        syntaxis: '',
        args: '',
      });
      this.registerCommand('debug', {
        definition: 'Set debug mode',
        function: this._setDebugMode,
        detail: 'Set debug mode:<br/>- 0: Disabled<br/>- 1: Enabled<br/>- 2: Enabled with Assets',
        syntaxis: '<MODE>',
        args: 'i',
      });
    },

    _clean: function(params) {
      this.clean();
      return $.when();
    },

    _setDebugMode: function(params) {
      var mode = params[0];
      if (mode == 0) {
        this.print("Debug mode <strong>disabled</strong>. Reloading page...");
        var qs = $.deparam.querystring();
        delete qs.debug;
        window.location.search = '?' + $.param(qs);
      }
      else if (mode == 1) {
        this.print("Debug mode <strong>enabled</strong>. Reloading page...");
        window.location = $.param.querystring(window.location.href, 'debug=');
      }
      else if (mode == 2) {
        this.print("Debug mode with assets <strong>enabled</strong>. Reloading page...");
        window.location = $.param.querystring(window.location.href, 'debug=assets');
      } else {
        this.print("[!] Invalid debug mode");
      }

      return $.when();
    },

    _printEval: function(params) {
      var self = this;
      return $.when($.Deferred(function(d){
        try {
          self.print(eval(params.join(' ')));
          d.resolve();
        } catch (err) {
          d.reject();
        }
      }));
    },

    _reloadPage: function(params) {
      var self = this;
      return $.when($.Deferred(function(d){
        try {
          location.reload();
          d.resolve();
        } catch (err) {
          d.reject();
        }
      }));
    },

    _searchModelRecord: function(params) {
      var model = params[0];
      var fields = params[1]==='*'?false:params[1].split(',');
      var domain = params[2] || "[]";
      var self = this;
      return rpc.query({
        method: 'search_read',
        domain: eval(domain),
        fields: fields,
        model: model,
        kwargs: {context: session.user_context},
      }).then(function(result){
        for (var record of result)
        {
          self.print(`${record.id}. `, false);
          delete record['id'];
          for (var field in record) {
            self.print(_.template("<%= field %>: <%= value %>, ")({field:field, value:record[field]}), false);
          }
          self.print('');
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
        kwargs: {context: session.user_context},
      }).then(function(result){
        if (result.length) {
          rpc.query({
            method: 'button_immediate_upgrade',
            model: 'ir.module.module',
            args: [result[0].id],
          }).then(function(){
            self.print(_.template("'<%= module %>' module successfully upgraded")({module:module}));
          }).fail(function(){
            self.print(_.template("[!] Can't upgrade '<%= module %>' module")({module:module}));
          });
        } else {
          self.print(_.template("[!] '<%= module %>' module doesn't exists")({module:module}));
        }
      });
    },

    _viewModelRecord: function(params) {
      var model = params[0];
      var self = this;
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
      if (params.length === 1) {
        return this.do_action({
            type: 'ir.actions.act_window',
            res_model: model,
            views: [[false, 'form']],
            target: 'current',
        }).then(function(){
          self.do_hide();
        });
      } else {
        var values = params[1];
        values = values.replace(new RegExp("'", 'g'), '"');
        return rpc.query({
          method: 'create',
          model: model,
          args: [JSON.parse(values)],
          kwargs: {context: session.user_context},
        }).then(function(result){
          self.print(_.template("<%= model %> record create successfully: <%= new_id %>")({model:model, new_id:result}));
        });
      }
    },

    _unlinkModelRecord: function(params) {
      var model = params[0];
      var record_id = parseInt(params[1], 10);
      var self = this;
      return rpc.query({
        method: 'unlink',
        model: model,
        args: [record_id],
        kwargs: {context: session.user_context},
      }).then(function(result){
        self.print(_.template("<%= model %> record deleted successfully")({model:model}));
      });
    },

    _writeModelRecord: function(params) {
      var model = params[0];
      var record_id = parseInt(params[1], 10);
      var values = params[2];
      values = values.replace(new RegExp("'", 'g'), '"');
      var self = this;
      return rpc.query({
        method: 'write',
        model: model,
        args: [record_id, JSON.parse(values)],
        kwargs: {context: session.user_context},
      }).then(function(result){
        self.print(_.template("<%= model %> record updated successfully")({model:model}));
      });
    },

    _openSettings: function(params) {
      var self = this;
      return this.do_action({
          type: 'ir.actions.act_window',
          res_model: 'res.config.settings',
          views: [[false, 'form']],
          target: 'current',
      }).then(function(){
        self.do_hide();
      });
    },
  });

});
