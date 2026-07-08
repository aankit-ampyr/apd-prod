# Icon addition implementation workflow

This document will serve as a guide for the AI to add svg icons in the code base while following all the standard for coding.

## Brief & Context
This project is configured with **vite-svgr-plugin** and it is a mono repo which shared ui-lib that exposes various icons for this platform

you are supposed to modile files inside `packages/react-common/src/assets/icons` which is relative to the root of the project

## Checking new icons
All the icons are added as svg icons inside `packages/react-common/src/assets/icons` folder, you are supposed to run the following terminal command to get list of untracked/added or updated files in this folder

```bash
git status --short packages/react-common/src/assets/icons
```

this outout might be 

```bash
?? packages/react-common/src/assets/icons/empty-cell.svg
?? packages/react-common/src/assets/icons/supported-document-shield.svg
```

look for untracked or added files only and ignore added/renamed/deleted files.

## Add Icon
Once the new icons are detected, you are supposed to update `packages/react-common/src/assets/icons/index.ts` file which stores the mapping of the icons

* Below are the steps to be followed:

    * Since we are using **vite-svgr-plugin** you have to import the SVG icon import the file as 

        ```js
        import IconName from './icon-name.svg?react';
        ```

        here import path is `./` followed by icon name . svg + `?react` 

    * The Name of the icon component while import must be the same name as icons name but in PascalCase. for example: 

        ```js
        import EmptyCell from './empty-cell.svg?react';
        import EmptyCell2 from './empty-cell-2.svg?react'; // if number are there
        import Tag from './tag/svg?react';
        ```
    * make sure the Component name while importing does not collide with already existing icons component names

    * We also have component from lucide react lib so make sure not to touch imports and icons.

    * Finally update the icon mapping with the new icons

        ```js
        export const Icons = {
            // existing icons
            `empty-cell`: EmptyCell,
            `empty-cell-2`: EmptyCell2,
            tag: Tag,
        }
        ```

        here use while adding the icons key in Icons map, use kebab-case, also for keys with `-` wrap them in '' while those keys with are normal (no need for `-`) write them as it is.
    

    * Finally since we want icons to have custom color (allow color overriding), we need to modify the existing icon svg code to remote any hardcoded color value, for each avg files, look for `fill`, `stroke` property and see if they have ny harcoded color, it yes, replace it with `currentColor` string to allow color override. this is required for **vite-svgr-plugin**

    
