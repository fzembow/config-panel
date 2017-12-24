(function(window) {

  const CSS_VARS = {
    GREEN_COLOR: '#62bf7f',
    LINK_COLOR: 'blue'
  };

  const PANEL_CSS = `
    .cfgp-ConfigPanel {
      position: fixed;
      top: 0;
      left: 0;
      width: 150px;
      height: 100%;
      margin-left: -140px;
      transition: margin-left 0.25s ease-in-out, box-shadow 0.25s ease-in-out;
      background-color: rgba(255, 255, 255, 1.0);
      display: flex;
      flex-direction: column;
      z-index: 99999999;

      font: 10px "Helvetica Neue";
    }

    .cfgp-ConfigPanel:hover,
    .cfgp-ConfigPanel.is-expanded {
      margin-left: 0px;
      transition: margin-left 0.25s ease-in-out;
      box-shadow: 2px 0 2px rgba(0,0,0,0.25);
    }

    .cfgp-ConfigPanel-top {
      box-shadow: 0px 2px 2px rgba(0,0,0,0.1);
      padding: 10px 10px 0 10px;
      z-index: 1;
    }

    .cfgp-ConfigPanel-actions{
      display: flex;
      height: 20px;
      align-items: center;
    }

    .cfgp-ConfigPanel-actions > span:not(:last-child) {
      margin-right: 8px;
    }

    .cfgp-ConfigPanel-reloadRequired,
    .cfgp-ConfigPanel-reset{
      display: none;
      text-transform: uppercase;
      color: ${CSS_VARS.LINK_COLOR};
      cursor: pointer;
    }

    .cfgp-ConfigPanel-reloadRequired a {
      text-decoration: none;
    }

    .cfgp-ConfigPanel-reloadRequired a:visited {
      color: ${CSS_VARS.LINK_COLOR};
    }

    .cfgp-ConfigPanel > .cfgp-ConfigPanel-content{
      overflow-y: auto;
      overflow-x: auto;
      padding: 10px;
    }

    .cfgp-ConfigPanel-label{
      display: block;
      margin-top: 8px;
      margin-bottom: 4px;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: pre;
    }

    .cfgp-ConfigPanel-inputContainer{
      margin-bottom: 16px;
    }

    .cfgp-ConfigPanel-inputContainer.changed
    .cfgp-ConfigPanel-label{
      font-weight: bold;
    }

    .cfgp-ConfigPanel-inputContainer.changed
    .cfgp-ConfigPanel-label:before{
      content: '* ';
    }

    .cfgp-ConfigPanel-input,
    .cfgp-ConfigPanel-select,
    .cfgp-ConfigPanel-json{
      width: 100%;
      box-sizing: border-box;
      border: 1px solid #ddd;
    }

    .cfgp-ConfigPanel-input:focus,
    .cfgp-ConfigPanel-select:focus{
      border: 1px solid ${CSS_VARS.GREEN_COLOR};
      outline: 0;
    }

    .cfgp-ConfigPanel-link{
      color: ${CSS_VARS.LINK_COLOR};
      cursor: pointer;
    }

    .cfgp-ConfigPanel-json{
      font-family: monospace;
      display: none;
    }

    .cfgp-ConfigPanel-json.active{
      display: block;
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      top: 50%;
      height: 50%;
    }

    .cfgp-ConfigPanel-inputs .cfgp-ConfigPanel-inputs{
      padding-left: 10px;
      border-left: 1px solid #eee;
    }
  `;

  const PANEL_HTML = `
    <div class='cfgp-ConfigPanel-top'>
      <select class='cfgp-ConfigPanel-select'>
        <option></option>
      </select>
      <div class='cfgp-ConfigPanel-actions'>
        <span class='cfgp-ConfigPanel-reset'>Reset</span>
        <span class='cfgp-ConfigPanel-reloadRequired'><a href=''>Reload</a></span>
      </div>
    </div>

    <div class='cfgp-ConfigPanel-content'>
      <div class='cfgp-ConfigPanel-inputs'>
      </div>

      <label class='cfgp-ConfigPanel-label cfgp-ConfigPanel-link cfgp-ConfigPanel-jsonlink'>SHOW JSON</label>
      <textarea class='cfgp-ConfigPanel-json'>
      </textarea>
    </div>
  `;


  const VALID_GLOBAL_OPTIONS = {
    alwaysExpanded: 'boolean',
    localStoragePrefix: 'string',
    hidden: 'array',
  };


  const VALID_INPUT_TYPES = [
    'color',
    'enum',
    'integer',
    'number',
    'range',
    'text'
  ];


  // Which input types trigger updates based on `input` rather than `change` events?
  const ONINPUT_INPUT_TYPES = [
    'range',
    'text'
  ];


  const VALID_KEY_OPTIONS = {
    onChange: 'function',
    applyCssClass: 'boolean',
    reload: 'boolean',
    type: value => VALID_INPUT_TYPES.includes(value),
    min: 'number',
    max: 'number',
    step: 'number',
    options: 'array'
  };


  const DEFAULT_PRESET_LABEL = '[default]';
  const NEW_PRESET_LABEL = 'new...';
  const DEFAULT_LOCALSTORAGE_PREFIX = 'config-panel-';


  ConfigPanel = function(config, options = {}){
    this.options = options;
    this.localStorageKey = options.localStorageKey ? options.localStorageKey : DEFAULT_LOCALSTORAGE_PREFIX;

    if (!config) {
      throw new Error('You must instantiate ConfigPanel with a config object');
    }
    if (typeof config !== 'object') {
      throw new Error('config passed to ConfigPanel must be an object');
    }
    this.config = config;
    this.originalConfig = this.copyObject(this.config);

    const localData = this.loadLocalData();
    Object.assign(this.config, localData.config);

    this.presets = localData.presets;
    if (localData.currentPresetName) {
      // TODO: Load preset from url hash instead? Makes linking simpler to do.
      this.currentPresetName = localData.currentPresetName;
    }

    // Store the config that was loaded in storage.
    this.loadedConfig = this.copyObject(this.config);

    this.validateConfigAndOptions();

    this.containerEl = document.body;
    this.configPanelEl = document.createElement('div');
    this.configPanelEl.className = 'cfgp-ConfigPanel';
    this.configPanelEl.innerHTML = PANEL_HTML;
    if (this.options.alwaysExpanded) {
      this.configPanelEl.classList.add('is-expanded');
    }

    this.selectPresetEl = this.configPanelEl.querySelector('.cfgp-ConfigPanel-top .cfgp-ConfigPanel-select');
    this.selectPresetEl.addEventListener('change', this.onChangePreset.bind(this));


    this.jsonOutputEl = this.configPanelEl.querySelector('.cfgp-ConfigPanel-json');
    this.jsonOutputEl.addEventListener('blur', e => {
      this.jsonOutputEl.classList.remove('active');
    });

    this.showJsonEl = this.configPanelEl.querySelector('.cfgp-ConfigPanel-jsonlink');
    this.showJsonEl.addEventListener('click', e => {
      this.jsonOutputEl.classList.add('active');
      this.jsonOutputEl.select();
      e.preventDefault();
    });
    
    this.resetEl = this.configPanelEl.querySelector('.cfgp-ConfigPanel-reset');
    this.resetEl.addEventListener('click', e => {
      this.resetToCurrentConfig();
    });
    
    window.addEventListener('keydown', e => {
      if (e.keyCode === 27) {
        // Close JSON view on ESC
        this.jsonOutputEl.classList.remove('active');
      }
    });


    this.refreshPresets();

    this.refreshConfigDOM();
    this.injectCSS();
    this.containerEl.appendChild(this.configPanelEl);
  }


  ConfigPanel.prototype.getAvailablePresets = function() {
    const presets = this.presets;
    if (!presets) {
      return;
    }
    const presetLabels = Object.keys(presets);
    presetLabels.push(DEFAULT_PRESET_LABEL);
    presetLabels.sort();
    return presetLabels;
  }


  ConfigPanel.prototype.refreshPresets = function() {
    const currentConfig = this.currentPresetName ? this.presets[this.currentPresetName] : this.originalConfig;
    const objectsAreEqual = this.objectsAreEqual(this.config, currentConfig);

    this.selectPresetEl.innerHTML = '';
    const presets = this.getAvailablePresets();
    if (!objectsAreEqual) {
      presets.push(NEW_PRESET_LABEL);
    }

    if (presets) {
      presets.forEach(presetName => {
        const optionEl = document.createElement('option');
        optionEl.textContent = presetName;
        if (this.currentPresetName === presetName) {
          optionEl.selected = true;
        }
        this.selectPresetEl.appendChild(optionEl);
      });
    }

    // If the client config doesn't match what's in storage, allow resetting / saving
    // the client config.
    this.resetEl.style.display = objectsAreEqual ? 'none' : 'block';

    this.dumpJSON();
  }


  ConfigPanel.prototype.validateConfigAndOptions = function(){

    const globalOptionKeys = Object.keys(this.options).filter(key => key !== 'keys');

    globalOptionKeys.forEach(key => {
      if (!VALID_GLOBAL_OPTIONS[key]) {
        throw new Error(`${key} is not a valid option for ConfigPanel`);
      }

      const expectedKeyType = VALID_GLOBAL_OPTIONS[key];
      let actualKeyType = typeof this.options[key];
      if (actualKeyType === 'object' && Array.isArray(this.options[key])) {
        actualKeyType = 'array';
      }
      if (actualKeyType !== expectedKeyType) {
        throw new Error(`Option ${key} is a ${actualKeyType}. Expected a ${expectedKeyType}`);
      }
    });

    const keyOptions = this.options['keys'];
    this.validateKeyOptions(this.config, keyOptions);
  }


  ConfigPanel.prototype.validateKeyOptions = function(config, options = {}, keyPrefix = ''){
    Object.keys(options).forEach(key => {
      const keyPath = keyPrefix + key;
      if (config[key] === undefined) {
        throw new Error(`There is an option for ${keyPath}, which doesn't exist in the config`);
      }

      if (typeof config[key] === 'object') {
        if (typeof options[key] !== 'object') {
          throw new Error(`Options for nested config ${keyPath} must be an object`);
        }
        let newKeyPrefix = keyPrefix ? keyPrefix + '.' + key + '.' : key + '.';
        this.validateKeyOptions(config[key], options[key], newKeyPrefix);

      } else {

        const keyOptions = options[key];
        if (typeof keyOptions !== 'object') {
          throw new Error(`Options for key ${keyPath} must be an object`);
        }

        Object.keys(keyOptions).forEach(keyOption => {
          if (!VALID_KEY_OPTIONS[keyOption]) {
            throw new Error(`${keyOption} is not a supported option for options.keys.${keyPath}`);
          }

          const expectedKeyOptionType = VALID_KEY_OPTIONS[keyOption];
          const actualKeyValue = keyOptions[keyOption];
          let actualKeyOptionType = typeof actualKeyValue;
          if (actualKeyOptionType === 'object') {
            if (Array.isArray(actualKeyValue)) {
              actualKeyOptionType = 'array';
            }
          }
          
          if (typeof expectedKeyOptionType !== 'function' &&  actualKeyOptionType !== expectedKeyOptionType) {
            throw new Error(`Option ${keyOption} for key ${keyPath} is a ${actualKeyOptionType}. Expected a ${expectedKeyOptionType}`);
          } else if (typeof expectedKeyOptionType === 'function' && !expectedKeyOptionType(keyOptions[keyOption])) {
            throw new Error(`'${actualKeyValue}' is not a valid ${keyOption} (at options.keys.${keyPath}). Expected: ${expectedKeyOptionType}`);
          }

          // Custom type-specific validations
          if (keyOption === 'type') {
            if (actualKeyValue === 'range') {
              if (keyOptions['min'] === undefined || keyOptions['max'] === undefined) {
                throw new Error(`Option type: 'range' for key ${keyPath} required both a min and a max defined.`);
              }
            }

            if (actualKeyValue === 'enum') {
              const enumOptions = keyOptions['options'];
              if (!enumOptions || !enumOptions.length) {
                throw new Error(`You must define at least one option for 'enum' type keys (as an array at options.keys.${keyPath}.options)`);
                
              }

              if (!enumOptions.includes(config[key])) {
                throw new Error(`The value for ${keyPath} in your config, ${config[key]}, doesn't match any valid option specified at options.keys.${keyPath}.options (${enumOptions.join(',')})`);
              }
            }

            if (actualKeyValue === 'integer' && !Number.isInteger(config[key])) {
              throw new Error(`Key ${keyPath} must be an integer but is ${config[key]}`);
            }
          }
        });
      }
    });
  }


  ConfigPanel.prototype.refreshConfigDOM = function(){
    const inputsEl = this.configPanelEl.querySelector('.cfgp-ConfigPanel-inputs');
    inputsEl.innerHTML = '';
    this.injectConfigDOM(inputsEl, this.config, this.options.keys, this.options.hidden);
  }


  ConfigPanel.prototype.injectConfigDOM = function(
      parentEl,
      config,
      keyOptions = {},
      hiddenKeyPaths = []){

    Object.keys(config).forEach(key => {
      if (hiddenKeyPaths.includes(key)) {
        return;
      }

      if (typeof config[key] == 'object') {
        // Don't show objects with no keys.
        const childKeys = Object.keys(config[key]);
        if (childKeys.length === 0) {
          return;
        }

        // Recurse into objects
        const relevantHiddenKeyPaths = hiddenKeyPaths
            .filter(path => path.startsWith(key))
            .map(path => path.replace(new RegExp(`${key}.`, 'g'), ''));

        // Don't show objects with all hidden keys
        if (childKeys.filter(key => !relevantHiddenKeyPaths.includes(key)).length === 0) {
          return;
        }

        const container = this.createNestedConfigContainer(key);
        parentEl.appendChild(container);

        this.injectConfigDOM(
            container.querySelector('.cfgp-ConfigPanel-inputs'),
            config[key],
            keyOptions[key],
            relevantHiddenKeyPaths);
      } else {
        parentEl.appendChild(this.createInput(config, key, keyOptions[key]));
      }
    });
  }


  ConfigPanel.prototype.injectCSS = function(){
    const styleElement = document.createElement('style');
    styleElement.textContent = PANEL_CSS;
    document.head.appendChild(styleElement);
  }


  ConfigPanel.prototype.createInput = function(config, key, options = {}){
    const inputGuid = guid();

    const container = document.createElement('div');
    container.className = 'cfgp-ConfigPanel-inputContainer';
    const label = document.createElement('label');
    label.textContent = label.title = key;
    label.className = 'cfgp-ConfigPanel-label';
    label.htmlFor = inputGuid;
    container.appendChild(label);

    const type = options.type ? options.type : this.detectInputType(config[key]);

    let input;
    if (type !== 'enum') {
      input = document.createElement('input');
      if (type === 'integer') {
        input.type = 'number';
        input.step = 1;
        input.pattern = '\\d*';
      } else {
        input.type = type;
      }
    } else {
      input = document.createElement('select');
      options.options.forEach(value => {
        const optionEl = document.createElement('option');
        optionEl.value = optionEl.textContent = value;
        input.appendChild(optionEl);
      });
    }

    input.className = 'cfgp-ConfigPanel-input';
    input.id = inputGuid;

    const value = config[key];
    if (type === 'checkbox') {
     input.checked = value === true;
    } else {
     input.value = value;
    }

    if (type === 'range') {
      input.min = options.min;
      input.max = options.max;
      if (options.step) {
        input.step = options.step;
      }
    }


    const eventName = ONINPUT_INPUT_TYPES.includes(input.type) ? 'input' : 'change';
    input.addEventListener(eventName, e => {
      const oldValue = config[key];
      let newValue;
      if (type === 'integer') {
        input.value = newValue = parseInt(input.value);
      } else if (input.type === 'number') {
        newValue = parseFloat(input.value);
      } else if (input.type === 'checkbox') {
        newValue = input.checked === true;
      } else {
        newValue = input.value;
      }

      config[key] = newValue;

      if (newValue !== this.loadedConfig[key]) {
        container.classList.add('changed');
      } else {
        container.classList.remove('changed');
      }

      this.saveConfigToStorage();
      this.checkIfReloadRequired();
      this.refreshPresets();

      if (options.onChange) {
        options.onChange(newValue, oldValue);
      }

      if (options.applyCssClass) {
        this.onChangeCssValue(key, newValue);
      }
      
      e.stopPropagation();
    });

    input.addEventListener('focus', e => {
      e.target.select();
    });

    // Prevent events from bubbling into the host application.
    input.addEventListener('keydown', e => {
      if (input.type === 'number' || type === 'integer') {
        const delta = e.shiftKey && type !== 'integer' ? 0.1 : 1.0;
        if (e.key === 'ArrowUp') {
          input.value = parseFloat((parseFloat(input.value) + delta).toFixed(1));
          input.dispatchEvent(new Event('input'));
          input.dispatchEvent(new Event('change'));
          e.preventDefault();
        } else if (e.key === 'ArrowDown') {
          input.value = parseFloat((parseFloat(input.value) - delta).toFixed(1));
          input.dispatchEvent(new Event('input'));
          input.dispatchEvent(new Event('change'));
          e.preventDefault();
        }
      }

      e.stopPropagation();
    });
    input.addEventListener('keypress', e => e.stopPropagation());
    input.addEventListener('keyup', e => e.stopPropagation());

    container.appendChild(input);

    if (options.applyCssClass) {
      this.onChangeCssValue(key, value);
    }

    return container;
  }


  ConfigPanel.prototype.onChangeCssValue = function(key, value) {
    if (value === true) {
      document.body.classList.add(key);
    } else {
      document.body.classList.remove(key);
    }
  }


  ConfigPanel.prototype.onChangePreset = function(e) {
    const targetPresetName = e.target.value;
    if (targetPresetName === NEW_PRESET_LABEL) {
      this.createNewPreset();
    } else {
      this.loadPreset(targetPresetName);
    }
  }


  ConfigPanel.prototype.createNewPreset = function() {
    const newPresetName = window.prompt('New preset name');
    if (newPresetName) {
      this.currentPresetName = this.currentPresetName = newPresetName;
      this.presets[newPresetName] = this.copyObject(this.config);
      this.refreshPresets();
      this.saveConfigToStorage();

    } else {
      this.selectPresetEl.value = this.currentPresetName ? this.currentPresetName : DEFAULT_PRESET_LABEL;
    }
  }


  ConfigPanel.prototype.loadPreset = function(presetName) {
    let config;
    if (presetName === DEFAULT_PRESET_LABEL) {
      config = this.copyObject(this.originalConfig);
      this.currentPresetName = undefined;
    } else {
      config = this.copyObject(this.presets[presetName]);
      this.currentPresetName = presetName;
    }
    this.selectPresetEl.value = this.currentPresetName ? this.currentPresetName : DEFAULT_PRESET_LABEL;
    
    Object.assign(this.config, config);

    this.saveConfigToStorage();
    this.refreshConfigDOM();
  }


  ConfigPanel.prototype.saveCurrentPreset = function() {
    // TODO: Implement me!
  }


  ConfigPanel.prototype.deletePreset = function() {
    // TODO: Implement me!
  }


  ConfigPanel.prototype.detectInputType = function(value) {
    if (parseFloat(value) == value) {
      return 'number';
    }
    if (typeof value === 'string' && value.match(/^#[0-9a-fA-F]{6}$/)) {
      return 'color';
    }
    if (typeof value === 'boolean') {
      return 'checkbox';
    }
    return 'text';
  }


  ConfigPanel.prototype.loadLocalData = function(){
    const data = localStorage[this.localStorageKey];
    if (!data) {
      return {
        config: this.copyObject(this.config),
        presets: {}
      }
    }

    const parsedData = JSON.parse(data);

    // Find the keys that are still relevant, if the shape of the config
    // has changed since what was saved in localStorage.
    const valuesAtKeyPaths = getValuesAtAllKeyPaths([parsedData.config, this.config]);
    const keyPathsToCopy = valuesAtKeyPaths
        .filter(path => {
          return path.values[0] !== undefined && path.values[1] !== undefined;
        })

    const hiddenKeyPaths = this.options.hidden || [];
    const loadedConfig = {}
    keyPathsToCopy
        .filter(path => !hiddenKeyPaths.includes(path.keyPath))
        .forEach(path => {
          setValueAtKeyPath(this.config, path.keyPath, path.values[0]);
        });

    return {
      config: loadedConfig,
      presets: parsedData.presets || {}
    }
  }


  // Only copy over values that continue to exist.
  ConfigPanel.prototype.validateLocalData = function(){
  }


  ConfigPanel.prototype.saveConfigToStorage = function(){
    const data = {
      config: this.config,
      presets: this.presets
    };

    if (this.currentPresetName) {
      data.currentPresetName = this.currentPresetName;
    }

    localStorage[this.localStorageKey] = JSON.stringify(data);
  }


  ConfigPanel.prototype.resetToCurrentConfig = function(){
    if (this.currentPresetName) {
      this.config = this.copyObject(this.presets[this.currentPresetName]);
    } else {
      this.config = this.copyObject(this.originalConfig);
    }

    this.checkIfReloadRequired();
    this.refreshPresets();
    this.refreshConfigDOM();
    this.saveConfigToStorage();
  }


  ConfigPanel.prototype.dumpJSON = function(){
    const json = JSON.stringify(this.config, null, 2);
    this.jsonOutputEl.textContent = json;
  }


  ConfigPanel.prototype.checkIfReloadRequired = function(){
    if (!this.options.keys) {
      return;
    }

    const differingKeyPaths = this.getDifferingKeyPaths(this.config, this.loadedConfig);
    for (let i = 0; i < differingKeyPaths.length; i++){
      const keyPath = differingKeyPaths[i];
      if (getValueAtKeyPath(this.options.keys, keyPath + '.reload')) {
        this.setReloadRequired(true);
        return;
      }
    }
    this.setReloadRequired(false);
  }


  ConfigPanel.prototype.setReloadRequired = function(required){
    this.configPanelEl.querySelector('.cfgp-ConfigPanel-reloadRequired').style.display = required ? 'block' : 'none';
  }


  ConfigPanel.prototype.createNestedConfigContainer = function(key){
    const el = document.createElement('div');

    const label = document.createElement('span');
    label.textContent = key;
    label.className = 'cfgp-ConfigPanel-label';
    el.appendChild(label);

    const inputsEl = document.createElement('div');
    inputsEl.className = 'cfgp-ConfigPanel-inputs';
    el.appendChild(inputsEl);

    return el;
  }


  ConfigPanel.prototype.copyObject = function(obj){
    return JSON.parse(JSON.stringify(obj));
  }


  // Recursively checks if two objects have equal values
  ConfigPanel.prototype.objectsAreEqual = function(a, b){
    return this.getDifferingKeyPaths(a, b).length === 0;
  }


  // Finds the keyPaths at which values differ
  ConfigPanel.prototype.getDifferingKeyPaths = function(a, b){
    const valuesAtKeypaths = getValuesAtAllKeyPaths([a, b]);
    const differingKeyPaths = valuesAtKeypaths
        .filter(v => {
          const values = v.values;
          return !values.every(value => {
            return value == values[0];
          });
        })
        .map(v => {
          return v.keyPath;
        });
    return differingKeyPaths;
  }


  /*
   * Traverses all keypaths of a set of objects, returning
   * an array of keypaths and the values of the objects at each possible path.
   */
  function getValuesAtAllKeyPaths(objects){
    const allKeyPaths  = objects.reduce((set, obj) => {
      const keyPaths = getAllKeyPaths(obj);
      keyPaths.forEach(keyPath => {
        set.add(keyPath);
      });
      return set;
      
    }, new Set());

    return Array.from(allKeyPaths).map(keyPath => {
      const values = objects.map(obj => {
        return getValueAtKeyPath(obj, keyPath);
      });
      return {
        keyPath: keyPath,
        values: values
      };
    });
  }

    
  function getAllKeyPaths(obj, prefixPath = ''){
    const keys = Object.keys(obj).reduce((keys, key) => {
      if (typeof obj[key] === 'object') {
        return keys.concat(getAllKeyPaths(obj[key], prefixPath + key + '.'));
      } else {
        keys.push(prefixPath + key);
        return keys;
      }
    }, []);
    return keys;
  }


  function getValueAtKeyPath(obj, keyPath) {
    const keys = keyPath.split('.');
    let key = keys.shift();
    obj = obj[key];
    while (obj) {
      if (!keys.length) {
        return obj;
      }

      key = keys.shift();
      obj = obj[key];
    }
    return obj;
  }


  function setValueAtKeyPath(obj, keyPath, value) {
    // TODO: Ensure that setting a non-existent keyPath fails.
    const keys = keyPath.split('.');
    let key = keys.shift();
    while (keys.length > 0) {
      obj = obj[key];
      key = keys.shift();
    }
    obj[key] = value;
  }


  function deleteValueAtKeyPath(obj, keyPath) {
    const keys = keyPath.split('.');
    let key = keys.shift();
    while (keys.length > 0) {
      obj = obj[key];
      key = keys.shift();
    }
    delete obj[key];
  }


  function guid() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();
  }

}(window, document));
