// Config
import { DEFAULT_ALLOWED_EXTENSIONS } from './constants';

// Types
import { Config } from '../types/types';

export default {
    root: 'src',
    allowedExtensions: DEFAULT_ALLOWED_EXTENSIONS,
    blocks: [
        {
            name: 'React',
            libraries: ['react', 'react-native']
        },
        {
            name: 'Hooks',
            folders: ['hooks']
        },
        {
            name: 'Redux',
            libraries: ['redux', 'react-redux', 'redux-persist'],
            folders: ['store']
        },
        {
            name: 'Api',
            libraries: ['react-query'],
            folders: ['api']
        },
        {
            name: 'Screens',
            folders: ['screens']
        },
        {
            name: 'Components',
            folders: ['components']
        },
        {
            name: 'Navigation',
            libraries: ['@react-navigation/native', '@react-navigation/native-stack']
        },
        {
            name: 'Config',
            folders: ['config']
        },
        {
            name: 'Utils',
            folders: ['utils']
        },
        {
            name: 'Themes',
            libraries: ['@shopify/restyle'],
            folders: ['themes']
        },
        {
            name: 'Types',
            folders: ['types']
        }
    ]
} as Config;
