// Copyright 2018 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
odoo.define('terminal.BasicFunctions', function(require) {
  'use strict';

  var rpc = require('web.rpc');
  var Terminal = require('terminal.Terminal');

  Terminal.include({
    init: function() {
      this._super.apply(this, arguments);

      this.registerCommand('clean', {
        definition: 'Clean terminal',
        function: this._clean,
        detail: '',
        syntaxis: '',
      });
      this.registerCommand('print', {
        definition: 'Print a message',
        function: this._printEval,
        detail: 'Evail parameters and print the result',
        syntaxis: '<MSG>',
      });
      this.registerCommand('create', {
        definition: 'Create new record',
        function: this._createModelRecord,
        detail: 'Open new model record in form view',
        syntaxis: '<MODEL NAME>',
      });
      this.registerCommand('view', {
        definition: 'View model record/s',
        function: this._viewModelRecord,
        detail: 'Open model record in form view or record in list view',
        syntaxis: '<MODEL NAME> [RECORD ID]',
      });
      this.registerCommand('search', {
        definition: 'Search model record/s',
        function: this._searchModelRecord,
        detail: 'Launch orm search query\nFields are separated by commas.',
        syntaxis: '<MODEL NAME> <FIELDS> [DOMAIN]',
      });
      this.registerCommand('upgrade', {
        definition: 'Upgrade a module',
        function: this._upgradeModule,
        detail: 'Launch upgrade module process',
        syntaxis: '<MODULE NAME>',
      });
    },

    _clean: function(params) {
      this.clean();
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
      return this.do_action({
          type: 'ir.actions.act_window',
          res_model: model,
          views: [[false, 'form']],
          target: 'current',
      }).then(function(){
        self.do_hide();
      });
    },
  });

});
