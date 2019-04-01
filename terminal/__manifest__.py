# Copyright 2018 Alexandre Díaz <dev@redneboa.es>
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

{
    'name': 'Terminal',
    'version': '12.0.0.2.0',
    'author': "Alexandre Díaz <dev@redneboa.es>",
    'website': '',
    'category': 'Extra Tools/Terminal',
    'summary': "Terminal",
    'description': "A Console for run commands",
    'depends': [
        'web',
    ],
    'external_dependencies': {
        'python': []
    },
    'data': [
        'views/general.xml',
        'security/ir_rule.xml',
        'security/ir.model.access.csv',
    ],
    'qweb': [
        'static/src/xml/*.xml',
    ],
    'test': [
    ],

    'installable': True,
    'auto_install': False,
    'license': 'AGPL-3',
}
