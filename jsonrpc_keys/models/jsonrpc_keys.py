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
from openerp import models, fields, api, exceptions
import os
import binascii
import logging

_logger = logging.getLogger(__name__)

class jsonrpc_routes(models.Model):
    _name='jsonrpc.routes'
    
    @api.one
    def increase_uses(self):
        self.uses += 1
    
    @api.onchange('url')
    @api.one
    def _onchange_url(self):
        _logger.info("TEEEST")
        self.uses = 0
    
    url = fields.Char(string="URL", size=128, required=True)
    uses = fields.Integer(string="Uses", default=0)
    jsonrpc_keys_id = fields.Many2one('jsonrpc.keys', 'Key')

class jsonrpc_keys(models.Model):
    _name='jsonrpc.keys'
    _inherit = ['mail.thread']
    _track = {
        'key': {},
        'user_id': {},
        'actived': {},
        'json_rpc_routes_ids': {},
    }
    
    @api.v8
    def check_key(self, key, url):
        key_id = self.search([('key', '=', key), ('actived', '=', True)], limit=1)
        if not key_id:
            return (None, None)
        if key_id.json_rpc_routes_ids and len(key_id.json_rpc_routes_ids) > 0:
            clean_url = url.split('?')[0].lower()
            for key_res in key_id.json_rpc_routes_ids:
                if clean_url == key_res.url.lower():
                    return (key_id, key_res)
            return (None, None)
        return (key_id, None)
    
    @api.one
    def generate_key(self):
        self.key = binascii.hexlify(os.urandom(32)).decode()
        return True
    
    @api.one
    def increase_uses(self):
        self.uses += 1
    
    
    key = fields.Char(string='Key', size=128, required=True, unique=True, track_visibility='onchange')
    user_id = fields.Many2one('res.users', string='User', required=True, track_visibility='always')
    actived = fields.Boolean(string='Activated?', default=True, track_visibility='always')
    uses = fields.Integer(string="Uses", default=0)
    json_rpc_routes_ids = fields.One2many('jsonrpc.routes', 'jsonrpc_keys_id', 
                                            'Routes', track_visibility='onchange')
    