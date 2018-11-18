# ODOO TERMINAL

Manage Odoo with commands.

### FEATURES
- Interactive Terminal
- View models
- Manage records (Create, Read, Update, Delete)
- Manage modules (Install, Upgrade, Uninstall)
- Use alias
- Call model methods
- Launch actions
- And more...

### USAGE
- Press F1
- Debug Menu Entry

### EXAMPLE COMMANDS
- Create Record: ```create res.partner "{'name': 'The One'}"```
- Create Alias: ```alias myalias "print Hello, World!"```
- Install Module: ```install mymodule```


### PUBLIC METHODS (Javascript)
- ```print(str)``` Print a message
- ```eprint(str)``` Print a escaped message
- ```clean()``` Clean terminal
- ```cleanInput()``` Clean input
- ```registerCommand(str, cmdDef)``` Register new command
- ```executeCommand(str)``` Execute a command
- ```do_show()``` Show terminal
- ```do_hide()``` Hide terminal
- ```do_toggle()``` Toggle visibility

### DEFINE NEW COMMANDS (Javascript)
Commands works with promises

##### Command definition
```javascript
{
  definition: ,
  function: ,
  detail: ,
  syntaxis: ,
  args: ,
}
```
- definition: String.
- function: Function Pointer.
- detail: String.
- syntaxis: String. <> Required | [] Optional
- args: String. 's' String | 'i' Integer | '?' Optional Parameter

##### Basic Example
```javascript
odoo.define('terminal.MyFuncs', function(require) {
  'use strict';

  var Terminal = require('terminal.Terminal');

  Terminal.include({
    init: function() {
      this._super.apply(this, arguments);

      this.registerCommand('mycommand', {
        definition: 'This is my command',
        function: this._myFunc,
        detail: 'My command explained...',
        syntaxis: '<STRING> <INT> [STRING]',
        args: 'si?s',
      });
    },

    _myFunc: function(params) {
      var pA = params[0];
      var pB = params[1];
      var pC = params[2] || "DefaultValue";
      var self = this;

      console.log("1º Param (String): " + pA);
      console.log("2º Param (Int): " + pB);
      console.log("3º Param (Optional String): " + pC);

      var defer = $.Deferred(function(d){
        self.print("Hello, World!");
        d.resolve();
      });

      return $.when(defer);
    },
  });

});
```
