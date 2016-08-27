# -*- coding: utf-8 -*-
##############################################################################
#
#    OpenERP, Open Source Management Solution
#    Copyright (C) 2016 Solucións Aloxa S.L. <info@aloxa.eu>
#
#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU General Public License as published by
#    the Free Software Foundation, either version 3 of the License, or
#    (at your option) any later version.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU General Public License for more details.
#
#    You should have received a copy of the GNU General Public License
#    along with this program.  If not, see <http://www.gnu.org/licenses/>.
#
##############################################################################
import logging
import werkzeug
import openerp
from openerp.http import request
from openerp.osv import orm
from openerp.tools.translate import _

_logger = logging.getLogger(__name__)

class ir_http(orm.AbstractModel):
    _inherit = 'ir.http'

    def _dispatch(self):
        if hasattr(request, 'jsonrpckey'):
            delattr(request, 'jsonrpckey')
            
        func = None
        try:
            func, arguments = self._find_handler()
            request.jsonrpckey_enabled = func.routing.get('jsonrpckey', False)
        except werkzeug.exceptions.NotFound:
            request.jsonrpckey_enabled = True
            
        key_id = None
        key_res = None

        if request.jsonrpckey_enabled:
            key = None
            if request.params.has_key('key'):
                key = request.params['key']
                request.params.pop('key')
                
            try:
                if not func.routing['type'] == 'json':
                    raise Exception("Can't use jsonrpc_keys in non json-rpc route")
                
                if not key or len(key) == 0:
                    raise Exception('Invalid Key!')
                
                key_obj = request.env['jsonrpc.keys'].sudo()
                key_id, key_res = key_obj.check_key(key, request.httprequest.path)
                if not key_id:
                    raise Exception('Access Denied!')
                
                setattr(request, 'jsonrpckey', { 'user': key_id.user_id })
            except Exception, e:
                resp = super(ir_http, self)._handle_exception(e)
                return resp
        
        resp = super(ir_http, self)._dispatch()
        
        if request.jsonrpckey_enabled and key_id:
            if key_res:
                key_res.increase_uses()
            key_id.increase_uses()
            key_id.sudo(user=key_id.user_id).message_post(body=_("%s used this key in '%s'") % 
                                      (request.httprequest.remote_addr, request.httprequest.path))
        return resp
