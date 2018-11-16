# Copyright 2018 Alexandre Díaz <dev@redneboa.es>
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo import models, fields, api, exceptions


class TerminalAlias(models.Model):
    _name = 'terminal.alias'

    name = fields.Char(required=True)
    command = fields.Char(string="Command", required=True)

    _sql_constraints = [('name_unique', 'unique(name)',
                         'Alias name must be unique')]
