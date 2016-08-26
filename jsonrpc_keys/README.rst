.. image:: https://img.shields.io/badge/licence-AGPL--3-blue.svg
    :alt: License: AGPL-3

JSON-RPC Keys
=============

Store Keys for use in anymous json-rpc calls. You can assign keys to users for know who is using it and for use with "sudo()".


Parameters
==========
**Key** - The key

**User** - The user identified by the key

**Actived** - Check if the key can be used

**urls** - List of URL's separated by line affected by the key (empty for all)
       

Usage
=====

To use this module, you need to:

1. Create new key in configuration panel

2. Send the attribute 'key' inside 'params' in the json-rpc call:

    ``{``
      ``"jsonrpc": "2.0",``

      ``"id": 0,``

      ``"method": "call",``

      ``"params": {``

        ``"key": "The Key",``

        ``[...]``

      ``}``

    ``}``

3. Add to your controller route decorator:
    jsonrpckey=True
    
    ``@http.route(['/mi/test'], type='json', auth="none", jsonrpckey=True)``
    
4. Now your controller can access to:
    
    ``request.jsonrpckey['user']``
    
    This is a 'res.users' record.



Credits
=======

Creator
------------

* Alexandre Díaz <alex@aloxa.eu>
