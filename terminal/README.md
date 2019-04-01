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
- Customizable
- And more...

### USAGE
- Press CTRL + 1
- Debug Menu Entry

### EXAMPLE COMMANDS
- Create Record: ```create res.partner "{'name': 'The One'}"```
- Search Record: ```search res.partner name "[['id', '>', 5]]"```
- Create Alias: ```alias myalias "print Hello, $1!"```
- Call Alias: ```myalias Me```
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
  definition: 'string',
  callback: function,
  detail: 'string',
  syntaxis: 'string',
  args: 'string',
}
```
- definition: Quick definition.
- callback: Callback function.
- detail: Command explained.
- syntaxis: Command Parameters (For Humans)
    - <> Required
    - [] Optional
- args: Command Paramerters Types
    - 's' String
    - 'i' Integer
    - '?' Indicates that next parameter is optional

##### Basic Example
```javascript
odoo.define('terminal.MyFuncs', function(require) {
  'use strict';

  var Terminal = require('terminal.Terminal').terminal;

  Terminal.include({
    init: function() {
      this._super.apply(this, arguments);

      this.registerCommand('mycommand', {
        definition: 'This is my command',
        function: this._myFunc,
        detail: 'My command explained...',
        syntaxis: '<STRING: ParamA> <INT: ParamB> [STRING: ParamC]',
        args: 'si?s',
      });
    },

    _myFunc: function(params) {
      var pA = params[0];
      var pB = params[1];
      var pC = params[2] || "DefaultValue";
      var self = this;

      var defer = $.Deferred(function(d){
        self.print("Hello, World!");
        self.eprint("ParamA (String): " + pA);
        self.eprint("ParamB (Int): " + pB);
        self.eprint("ParamC (Optional String): " + pC);

        if (Number(pA) === pB) {
          d.resolve();
        } else {
          d.reject("Oops! error");
        }
      });

      return $.when(defer);
    },
  });

});
```
