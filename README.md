# config-panel

An easy way to change and manage configurations for javascript projects.

In a many prototypes, side projects, and art hacks, I've found myself re-implementing ways to alter configuration used by a web project. Whether it's enabling or disabling a feature or changing some parameter in a simulation, it's useful to be able to change configuration on-the-fly without having to alter code + reload.

`config-panel` allows you to throw in your existing configuration object and lets you tweak it live.

## Installation

For now, the easiest way to use config-panel in a JS project is via rawgit:

```
  <script src="https://rawgit.com/fzembow/config-panel/master/config-panel.js"></script>
```

## Basic usage

Let's say I have a configuration object that looks like this:

```
  const config = {
    number: 20,
    boolean: true,
    text: 'hello',
    color: '#abdefe',
    nested: {
      is: 'Also okay'
    }
  };

```

To get a configuration panel, all you need to do is:

```
  const panel = new ConfigPanel(config);
```

`config-panel` will introspect the data and determine the best input for each data in your config.

Note that `config-panel` mutates the original object in-place.

## Advanced usage + options

The `ConfigPanel()` constructor also takes an optional `options` object argument:

```
  const panel = new ConfigPanel(config, options);
```

It can take the following keys:

* *`alwaysExpanded`* _(default: false)_. If `true`, the config panel will always be visible.
* *`hidden`* _(default: [])_. If defined, key paths in this array will not be loaded into the config panel. Useful for when configuration contains some values that should not be changed by users, or are noisy. It's possible to set top-level keys to hide, like `'colors'`, or nested keys, like `'velocity.x'`;
* *`localStoragePrefix`* _(default: 'config-panel-')_. When set, the config panel will store its state with this prefix in localStorage.

It's also possible to apply options for particular keys in your config, in the `keys` key of the options you provide to `ConfigPanel`. Supported options for keys include:

* *`reload`* _(default: false)_. If `true`, will prompt the user to reload the browser when changed. This is useful if you have a configuration that is used in the initiation of your page. Values are persisted across reloads in localStorage.
* *`onChange`* _(default: undefined)_. A function, if defined, will be called whenever the key is updated in the panel. The function will be called with `(newValue, oldValue)`.
* *`type`* _(allowed: 'color', 'number', 'range', 'text')_. When set, will force the key's input type. Note that you can also pass `min`, `max`, and `step`, which will apply when the `type` is set to `'range'`.
* *`applyCssClass`* _(default: false) (only applies to boolean config keys)_. If `true`, will apply a CSS class to the document's `<body>` element when the config is itself true for this key. Useful for selectively enabling or disabling styles in prototypes.

Key options can also be nested, just like the config object itself.

If you provide options that aren't valid, you will see an error in your javascript console and config-panel will not load.
