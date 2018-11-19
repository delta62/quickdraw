const config: Record<string, any> = { };

/**
 * Set a configuration variable in the library
 *
 * @note any unknown variables will be ignored
 *
 * @param configName the name of the configuration value
 * @param configValues the value to set the property to
 */
export function setConfig(configName: string, configValue: any) {
    config[configName] = configValue;
};

/**
 * Gets the current setting for a configuration in the library
 * @param configName the name of the configuration value to get
 * @return the value associated if set, null otherwise
 */
export function getConfig(configName: string) {
    return config[configName] != null ? config[configName] : null;
}
