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
```

To get a configuration panel, all you need to do is:

```
  const panel = new ConfigPanel(config);
```

Note that `config-panel` mutates the original object in-place.

## Advanced usage + options

## Roadmap

- Finish implementation of presets
- Ensure config applies to nested elements, eg you should be able to apply config to a parent object for all of its keys
- Add real documentation to README.md
- make sure that callback is changed on load of a preset
- allow saving to overwrite existing preset
- only add the `changed` class if the value is different than the loaded value
- Make into module
