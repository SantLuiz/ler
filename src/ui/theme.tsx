import {createContext,useContext,type Accessor} from 'solid-js';
import {themeFor} from '../state/palettes';
import type {Theme} from '../state/palettes';
const fallback=themeFor({background:'#101114',foreground:'#d6d6d6'});
export const ThemeContext=createContext<Accessor<Theme>>(()=>fallback);
export const useTheme=()=>useContext(ThemeContext);
