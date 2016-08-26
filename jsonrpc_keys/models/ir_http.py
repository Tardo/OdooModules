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

_logger = logging.getLogger(__name__)

class ir_http(orm.AbstractModel):
    _inherit = 'ir.http'

    def _dispatch(self):
        request.jsonrpckey = { 'user': None }
        func = None
        key = None
        try:
            func, arguments = self._find_handler()
            request.jsonrpckey_enabled = func.routing.get('jsonrpckey', False)
        except werkzeug.exceptions.NotFound:
            request.jsonrpckey_enabled = True

        if request.jsonrpckey_enabled:
            try:
                if not func.routing['type'] == 'json':
                    raise Exception('Invalid Key!')
            except Exception, e:
                resp = super(ir_http, self)._handle_exception(e)
                return resp
            
            # Comprobar Key y obtener usuario
            try:
                key = request.params['key'] if request.params.has_key('key') else None
                if not key or len(key) == 0:
                    raise Exception('Invalid Key!')
            except Exception, e:
                resp = super(ir_http, self)._handle_exception(e)
                return resp
            
            request.params.pop('key')
        
            try:
                key_obj = request.env['jsonrpc.keys'].sudo()
                request.jsonrpckey['user'] = key_obj.check_key(key, request.httprequest.path)
                if not request.jsonrpckey['user']:
                    raise Exception('Access Denied!')
            except Exception, e:
                resp = super(ir_http, self)._handle_exception(e)
                return resp
        
        resp = super(ir_http, self)._dispatch()
        return resp
