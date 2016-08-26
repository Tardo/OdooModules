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


class jsonrpc_keys(models.Model):
    _name='jsonrpc.keys'
    _inherit = ['mail.thread']
    _track = {
        'key': {},
        'user_id': {},
        'actived': {},
        'urls': {},
    }
    
    @api.v8
    def check_key(self, key, url):
        key_id = self.search([('key', '=', key), ('actived', '=', True)], limit=1)
        if not key_id:
            return None
        if key_id.urls and len(key_id.urls) > 0:
            clean_url = url.split('?')[0]
            urls = key_id.urls.split('\n')
            if not clean_url in urls:
                return None
        return key_id.user_id
    
    @api.one
    def generate_key(self):
        self.key = binascii.hexlify(os.urandom(32)).decode()
        return True
    
    
    key = fields.Char(string='Key', size=128, required=True, unique=True, track_visibility='onchange')
    user_id = fields.Many2one('res.users', string='User', required=True, track_visibility='always')
    actived = fields.Boolean(string='Activated?', default=True, track_visibility='always')
    urls = fields.Char(string='URLs Affected', track_visibility='onchange')
    