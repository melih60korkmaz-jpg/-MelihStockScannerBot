import { $ as getHash, E as createBuilder, U as x, W as createLogger, Z as createDebugger, _t as __toESM, ft as VERSION, mt as require_picocolors } from "./chunks/node.js";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { inspect } from "node:util";
// ../../node_modules/.pnpm/cac@7.1.1/node_modules/cac/dist/index.js
const BRACKETS_AND_REST_RE = /[<[].+/;
const FILE_NAME_RE = /([^\\/]+)$/;
function removeBrackets(v) {
	return v.replace(BRACKETS_AND_REST_RE, "").trim();
}
function findAllBrackets(v) {
	const ANGLED_BRACKET_RE_GLOBAL = /<([^>]+)>/g;
	const SQUARE_BRACKET_RE_GLOBAL = /\[([^\]]+)\]/g;
	const res = [];
	const parse = (match) => {
		let variadic = false;
		let value = match[1];
		if (value.startsWith("...")) {
			value = value.slice(3);
			variadic = true;
		}
		return {
			required: match[0].startsWith("<"),
			value,
			variadic
		};
	};
	let angledMatch;
	while (angledMatch = ANGLED_BRACKET_RE_GLOBAL.exec(v)) res.push(parse(angledMatch));
	let squareMatch;
	while (squareMatch = SQUARE_BRACKET_RE_GLOBAL.exec(v)) res.push(parse(squareMatch));
	return res;
}
function getMriOptions(options) {
	const result = {
		alias: Object.create(null),
		boolean: []
	};
	for (const [index, option] of options.entries()) {
		if (option.names.length > 1) result.alias[option.names[0]] = option.names.slice(1);
		if (option.isBoolean) {
			if (option.negated) {
				if (!options.some((o, i) => {
					return i !== index && o.names.some((name) => option.names.includes(name)) && typeof o.required === "boolean";
				})) result.boolean.push(option.names[0]);
			} else result.boolean.push(option.names[0]);
		}
	}
	return result;
}
function findLongest(arr) {
	return arr.sort((a, b) => b.length - a.length)[0];
}
function padRight(str, length) {
	return str.length >= length ? str : `${str}${" ".repeat(length - str.length)}`;
}
function camelcase(input) {
	return input.replaceAll(/([a-z])-([a-z])/g, (_, p1, p2) => {
		return p1 + p2.toUpperCase();
	});
}
const UNSAFE_KEYS = /* @__PURE__ */ new Set([
	"__proto__",
	"constructor",
	"prototype"
]);
function setDotProp(obj, keys, val) {
	if (keys.some((key) => UNSAFE_KEYS.has(key))) return;
	let current = obj;
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		if (i === keys.length - 1) {
			current[key] = val;
			return;
		}
		if (!Object.hasOwn(current, key) || current[key] == null) {
			const nextKeyIsArrayIndex = +keys[i + 1] > -1;
			current[key] = nextKeyIsArrayIndex ? [] : {};
		}
		current = current[key];
	}
}
function setByType(obj, transforms) {
	for (const [key, transform] of Object.entries(transforms)) if (transform.shouldTransform && key in obj) {
		obj[key] = [obj[key]].flat();
		if (typeof transform.transformFunction === "function") obj[key] = obj[key].map(transform.transformFunction);
	}
}
function getFileName(input) {
	const m = FILE_NAME_RE.exec(input);
	return m ? m[1] : "";
}
function camelcaseOptionName(name) {
	return name.split(".").map((v, i) => {
		return i === 0 ? camelcase(v) : v;
	}).join(".");
}
var CACError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "CACError";
		if (typeof Error.captureStackTrace !== "function") this.stack = new Error(message).stack;
	}
};
const LEADING_DASHES_RE = /^-{1,2}/;
const NEGATED_PREFIX_RE = /^no-/;
var Option = class {
	rawName;
	description;
	/** Option name */
	name;
	/** Option name and aliases */
	names;
	isBoolean;
	required;
	config;
	negated;
	constructor(rawName, description, config) {
		this.rawName = rawName;
		this.description = description;
		this.config = Object.assign({}, config);
		rawName = rawName.replaceAll(".*", "");
		this.negated = false;
		this.names = removeBrackets(rawName).split(",").map((v) => {
			let name = v.trim().replace(LEADING_DASHES_RE, "");
			if (name.startsWith("no-")) {
				this.negated = true;
				name = name.replace(NEGATED_PREFIX_RE, "");
			}
			return camelcaseOptionName(name);
		}).sort((a, b) => a.length - b.length);
		this.name = this.names.at(-1);
		if (this.negated && this.config.default == null) this.config.default = true;
		if (rawName.includes("<")) this.required = true;
		else if (rawName.includes("[")) this.required = false;
		else this.isBoolean = true;
	}
};
let runtimeInfo;
if (typeof process !== "undefined") {
	let runtimeName;
	if (typeof Deno !== "undefined" && typeof Deno.version?.deno === "string") runtimeName = "deno";
	else if (typeof Bun !== "undefined" && typeof Bun.version === "string") runtimeName = "bun";
	else runtimeName = "node";
	runtimeInfo = `${process.platform}-${process.arch} ${runtimeName}-${process.version}`;
} else if (typeof navigator === "undefined") runtimeInfo = `unknown`;
else runtimeInfo = `${navigator.platform} ${navigator.userAgent}`;
/**
* `process.argv` at call time. It must not be captured when this module is
* imported: a runner may load cac before it rewrites `process.argv` for the
* script it is about to run.
*/
function getRuntimeProcessArgs() {
	return typeof process === "undefined" ? void 0 : process.argv;
}
var Command = class {
	rawName;
	description;
	config;
	cli;
	options;
	aliasNames;
	name;
	args;
	commandAction;
	usageText;
	versionNumber;
	examples;
	helpCallback;
	globalCommand;
	constructor(rawName, description, config = {}, cli) {
		this.rawName = rawName;
		this.description = description;
		this.config = config;
		this.cli = cli;
		this.options = [];
		this.aliasNames = [];
		this.name = removeBrackets(rawName);
		this.args = findAllBrackets(rawName);
		this.examples = [];
	}
	usage(text) {
		this.usageText = text;
		return this;
	}
	allowUnknownOptions() {
		this.config.allowUnknownOptions = true;
		return this;
	}
	ignoreOptionDefaultValue() {
		this.config.ignoreOptionDefaultValue = true;
		return this;
	}
	version(version, customFlags = "-v, --version") {
		this.versionNumber = version;
		this.option(customFlags, "Display version number");
		return this;
	}
	example(example) {
		this.examples.push(example);
		return this;
	}
	/**
	* Add a option for this command
	* @param rawName Raw option name(s)
	* @param description Option description
	* @param config Option config
	*/
	option(rawName, description, config) {
		const option = new Option(rawName, description, config);
		this.options.push(option);
		return this;
	}
	alias(name) {
		this.aliasNames.push(name);
		return this;
	}
	action(callback) {
		this.commandAction = callback;
		return this;
	}
	/**
	* Check if a command name is matched by this command
	* @param name Command name
	*/
	isMatched(name) {
		return this.name === name || this.aliasNames.includes(name);
	}
	get isDefaultCommand() {
		return this.name === "" || this.aliasNames.includes("!");
	}
	get isGlobalCommand() {
		return this instanceof GlobalCommand;
	}
	/**
	* Check if an option is registered in this command
	* @param name Option name
	*/
	hasOption(name) {
		name = name.split(".", 1)[0];
		return this.options.find((option) => {
			return option.names.includes(name);
		});
	}
	outputHelp() {
		const { name, commands } = this.cli;
		const { versionNumber, options: globalOptions, helpCallback } = this.cli.globalCommand;
		let sections = [{ body: `${name}${versionNumber ? `/${versionNumber}` : ""}` }];
		sections.push({
			title: "Usage",
			body: `  $ ${name} ${this.usageText || this.rawName}`
		});
		if ((this.isGlobalCommand || this.isDefaultCommand) && commands.length > 0) {
			const longestCommandName = findLongest(commands.map((command) => command.rawName));
			sections.push({
				title: "Commands",
				body: commands.map((command) => {
					return `  ${padRight(command.rawName, longestCommandName.length)}  ${command.description}`;
				}).join("\n")
			}, {
				title: `For more info, run any command with the \`--help\` flag`,
				body: commands.map((command) => `  $ ${name}${command.name === "" ? "" : ` ${command.name}`} --help`).join("\n")
			});
		}
		let options = this.isGlobalCommand ? globalOptions : [...this.options, ...globalOptions || []];
		if (!this.isGlobalCommand && !this.isDefaultCommand) options = options.filter((option) => option.name !== "version");
		if (options.length > 0) {
			const longestOptionName = findLongest(options.map((option) => option.rawName));
			sections.push({
				title: "Options",
				body: options.map((option) => {
					return `  ${padRight(option.rawName, longestOptionName.length)}  ${option.description} ${option.config.default === void 0 ? "" : `(default: ${option.config.default})`}`;
				}).join("\n")
			});
		}
		if (this.examples.length > 0) sections.push({
			title: "Examples",
			body: this.examples.map((example) => {
				if (typeof example === "function") return example(name);
				return example;
			}).join("\n")
		});
		if (helpCallback) sections = helpCallback(sections) || sections;
		console.info(sections.map((section) => {
			return section.title ? `${section.title}:\n${section.body}` : section.body;
		}).join("\n\n"));
	}
	outputVersion() {
		const { name } = this.cli;
		const { versionNumber } = this.cli.globalCommand;
		if (versionNumber) console.info(`${name}/${versionNumber} ${runtimeInfo}`);
	}
	checkRequiredArgs() {
		const minimalArgsCount = this.args.filter((arg) => arg.required).length;
		if (this.cli.args.length < minimalArgsCount) throw new CACError(`missing required args for command \`${this.rawName}\``);
	}
	/**
	* Check if the parsed options contain any unknown options
	*
	* Exit and output error when true
	*/
	checkUnknownOptions() {
		const { options, globalCommand } = this.cli;
		if (!this.config.allowUnknownOptions) {
			for (const name of Object.keys(options)) if (name !== "--" && !this.hasOption(name) && !globalCommand.hasOption(name)) throw new CACError(`Unknown option \`${name.length > 1 ? `--${name}` : `-${name}`}\``);
		}
	}
	/**
	* Check if the required string-type options exist
	*/
	checkOptionValue() {
		const { options: parsedOptions, globalCommand } = this.cli;
		const options = [...globalCommand.options, ...this.options];
		for (const option of options) {
			const value = parsedOptions[option.name.split(".", 1)[0]];
			if (option.required) {
				const hasNegated = options.some((o) => o.negated && o.names.includes(option.name));
				if (value === true || value === false && !hasNegated) throw new CACError(`option \`${option.rawName}\` value is missing`);
			}
		}
	}
	/**
	* Check if the number of args is more than expected
	*/
	checkUnusedArgs() {
		const maximumArgsCount = this.args.some((arg) => arg.variadic) ? 1e400 : this.args.length;
		if (maximumArgsCount < this.cli.args.length) throw new CACError(`Unused args: ${this.cli.args.slice(maximumArgsCount).map((arg) => `\`${arg}\``).join(", ")}`);
	}
};
var GlobalCommand = class extends Command {
	constructor(cli) {
		super("@@global@@", "", {}, cli);
	}
};
function isNumeric(val) {
	return Number.isFinite(+val);
}
function toVal(out, key, val, booleans) {
	let next;
	if (typeof val === "boolean") next = val;
	else if (booleans.includes(key)) {
		if (val === "false") next = false;
		else if (val === "true") next = true;
		else {
			out._.push(isNumeric(val) ? +val : val);
			next = !!val;
		}
	} else next = isNumeric(val) ? +val : val;
	const old = out[key];
	out[key] = old == null ? next : Array.isArray(old) ? old.concat(next) : [old, next];
}
function mri(args, opts) {
	const out = Object.create(null);
	out._ = [];
	const aliases = Object.create(null);
	Object.assign(aliases, opts.alias);
	for (const name of Object.keys(aliases)) {
		const list = aliases[name];
		for (const [i, alias] of list.entries()) aliases[alias] = [
			...list.slice(0, i),
			...list.slice(i + 1),
			name
		];
	}
	const booleans = [...opts.boolean];
	for (const name of opts.boolean) {
		const list = aliases[name];
		if (list) booleans.push(...list);
	}
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--") {
			out._ = out._.concat(args.slice(i + 1));
			break;
		}
		let dashes = 0;
		while (arg[dashes] === "-") dashes++;
		if (dashes === 0) {
			out._.push(arg);
			continue;
		}
		if (arg.slice(dashes, dashes + 3) === "no-") {
			out[arg.slice(dashes + 3)] = false;
			continue;
		}
		let eq = dashes + 1;
		while (eq < arg.length && arg[eq] !== "=") eq++;
		const name = arg.slice(dashes, eq);
		const val = arg.slice(eq + 1) || i + 1 === args.length || String(args[i + 1]).startsWith("-") || args[++i];
		const names = dashes === 2 ? [name] : name.split("");
		for (const [idx, flag] of names.entries()) toVal(out, flag, idx + 1 < names.length || val, booleans);
	}
	for (const key of Object.keys(out)) {
		const list = aliases[key];
		if (!list) continue;
		for (const alias of list) out[alias] = out[key];
	}
	return out;
}
var CAC = class extends EventTarget {
	/** The program name to display in help and version message */
	name;
	commands;
	globalCommand;
	matchedCommand;
	matchedCommandName;
	/**
	* Raw CLI arguments
	*/
	rawArgs;
	/**
	* Parsed CLI arguments
	*/
	args;
	/**
	* Parsed CLI options, camelCased
	*/
	options;
	showHelpOnExit;
	showVersionOnExit;
	/**
	* @param name The program name to display in help and version message
	*/
	constructor(name = "") {
		super();
		this.name = name;
		this.commands = [];
		this.rawArgs = [];
		this.args = [];
		this.options = {};
		this.globalCommand = new GlobalCommand(this);
		this.globalCommand.usage("<command> [options]");
	}
	/**
	* Add a global usage text.
	*
	* This is not used by sub-commands.
	*/
	usage(text) {
		this.globalCommand.usage(text);
		return this;
	}
	/**
	* Add a sub-command
	*/
	command(rawName, description, config) {
		const command = new Command(rawName, description || "", config, this);
		command.globalCommand = this.globalCommand;
		this.commands.push(command);
		return command;
	}
	/**
	* Add a global CLI option.
	*
	* Which is also applied to sub-commands.
	*/
	option(rawName, description, config) {
		this.globalCommand.option(rawName, description, config);
		return this;
	}
	/**
	* Show help message when `-h, --help` flags appear.
	*
	*/
	help(callback) {
		this.globalCommand.option("-h, --help", "Display this message");
		this.globalCommand.helpCallback = callback;
		this.showHelpOnExit = true;
		return this;
	}
	/**
	* Show version number when `-v, --version` flags appear.
	*
	*/
	version(version, customFlags = "-v, --version") {
		this.globalCommand.version(version, customFlags);
		this.showVersionOnExit = true;
		return this;
	}
	/**
	* Add a global example.
	*
	* This example added here will not be used by sub-commands.
	*/
	example(example) {
		this.globalCommand.example(example);
		return this;
	}
	/**
	* Output the corresponding help message
	* When a sub-command is matched, output the help message for the command
	* Otherwise output the global one.
	*
	*/
	outputHelp() {
		if (this.matchedCommand) this.matchedCommand.outputHelp();
		else this.globalCommand.outputHelp();
	}
	/**
	* Output the version number.
	*
	*/
	outputVersion() {
		this.globalCommand.outputVersion();
	}
	setParsedInfo({ args, options }, matchedCommand, matchedCommandName) {
		this.args = args;
		this.options = options;
		if (matchedCommand) this.matchedCommand = matchedCommand;
		if (matchedCommandName) this.matchedCommandName = matchedCommandName;
		return this;
	}
	unsetMatchedCommand() {
		this.matchedCommand = void 0;
		this.matchedCommandName = void 0;
	}
	/**
	* Parse argv
	*/
	parse(argv, { run = true } = {}) {
		if (!argv) {
			const runtimeProcessArgs = getRuntimeProcessArgs();
			if (!runtimeProcessArgs) throw new Error("No argv provided and runtime process argv is not available.");
			argv = runtimeProcessArgs;
		}
		this.rawArgs = argv;
		if (!this.name) this.name = argv[1] ? getFileName(argv[1]) : "cli";
		let shouldParse = true;
		for (const command of this.commands) {
			const parsed = this.mri(argv.slice(2), command);
			const commandName = parsed.args[0];
			if (command.isMatched(commandName)) {
				shouldParse = false;
				const parsedInfo = {
					...parsed,
					args: parsed.args.slice(1)
				};
				this.setParsedInfo(parsedInfo, command, commandName);
				this.dispatchEvent(new CustomEvent(`command:${commandName}`, { detail: command }));
			}
		}
		if (shouldParse) {
			for (const command of this.commands) if (command.isDefaultCommand) {
				shouldParse = false;
				const parsed = this.mri(argv.slice(2), command);
				this.setParsedInfo(parsed, command);
				this.dispatchEvent(new CustomEvent("command:!", { detail: command }));
			}
		}
		if (shouldParse) {
			const parsed = this.mri(argv.slice(2));
			this.setParsedInfo(parsed);
		}
		if (this.options.help && this.showHelpOnExit) {
			this.outputHelp();
			run = false;
			this.unsetMatchedCommand();
		}
		if (this.options.version && this.showVersionOnExit && this.matchedCommandName == null) {
			this.outputVersion();
			run = false;
			this.unsetMatchedCommand();
		}
		const parsedArgv = {
			args: this.args,
			options: this.options
		};
		if (run) this.runMatchedCommand();
		if (!this.matchedCommand && this.args[0]) this.dispatchEvent(new CustomEvent("command:*", { detail: this.args[0] }));
		return parsedArgv;
	}
	mri(argv, command) {
		const cliOptions = [...this.globalCommand.options, ...command ? command.options : []];
		const mriOptions = getMriOptions(cliOptions);
		let argsAfterDoubleDashes = [];
		const doubleDashesIndex = argv.indexOf("--");
		if (doubleDashesIndex !== -1) {
			argsAfterDoubleDashes = argv.slice(doubleDashesIndex + 1);
			argv = argv.slice(0, doubleDashesIndex);
		}
		let parsed = mri(argv, mriOptions);
		parsed = Object.keys(parsed).reduce((res, name) => {
			return {
				...res,
				[camelcaseOptionName(name)]: parsed[name]
			};
		}, { _: [] });
		const args = parsed._;
		const options = { "--": argsAfterDoubleDashes };
		const ignoreDefault = command && command.config.ignoreOptionDefaultValue ? command.config.ignoreOptionDefaultValue : this.globalCommand.config.ignoreOptionDefaultValue;
		const transforms = Object.create(null);
		for (const cliOption of cliOptions) {
			if (!ignoreDefault && cliOption.config.default !== void 0) for (const name of cliOption.names) options[name] = cliOption.config.default;
			if (Array.isArray(cliOption.config.type) && transforms[cliOption.name] === void 0) {
				transforms[cliOption.name] = Object.create(null);
				transforms[cliOption.name].shouldTransform = true;
				transforms[cliOption.name].transformFunction = cliOption.config.type[0];
			}
		}
		for (const [key, value] of Object.entries(parsed)) if (key !== "_") {
			setDotProp(options, key.split("."), value);
			setByType(options, transforms);
		}
		return {
			args,
			options
		};
	}
	runMatchedCommand() {
		const { args, options, matchedCommand: command } = this;
		if (!command || !command.commandAction) return;
		command.checkUnknownOptions();
		command.checkOptionValue();
		command.checkRequiredArgs();
		command.checkUnusedArgs();
		const actionArgs = [];
		command.args.forEach((arg, index) => {
			if (arg.variadic) actionArgs.push(args.slice(index));
			else actionArgs.push(args[index]);
		});
		actionArgs.push(options);
		return command.commandAction.apply(this, actionArgs);
	}
};
/**
* @param name The program name to display in help and version message
*/
const cac = (name = "") => new CAC(name);
// src/node/processStartTime.ts
var import_picocolors = /* @__PURE__ */ __toESM(require_picocolors(), 1);
const debug = createDebugger("vite:command-lock");
async function getProcessStartTime(pid) {
	try {
		if (process.platform === "linux") {
			const [stat, systemStat] = await Promise.all([fsp.readFile(`/proc/${pid}/stat`, "utf8"), fsp.readFile("/proc/stat", "utf8")]);
			const ticks = stat.slice(stat.lastIndexOf(")") + 1).trim().split(/\s+/)[19];
			const bootTime = /^btime (\d+)$/m.exec(systemStat)?.[1];
			if (!bootTime || !ticks || !/^\d+$/.test(ticks)) return;
			return `linux:${bootTime}:${ticks}`;
		}
		const isWindows = process.platform === "win32";
		if (isWindows) try {
			const { getProcessStartTime } = await import("napi-windows-process-start-time");
			return getProcessStartTime(pid) ?? void 0;
		} catch (error) {
			debug?.(`napi-windows-process-start-time is not available, falling back to powershell:\n${error}`);
		}
		const { stdout } = await x(isWindows ? "powershell.exe" : "ps", isWindows ? [
			"-NoLogo",
			"-NoProfile",
			"-NonInteractive",
			"-Command",
			`(Get-Process -Id ${pid} -ErrorAction Stop).StartTime.ToUniversalTime().Ticks`
		] : [
			"-p",
			String(pid),
			"-o",
			"lstart="
		], {
			timeout: 5e3,
			throwOnError: true,
			nodeOptions: {
				windowsHide: true,
				env: {
					...process.env,
					LC_ALL: "C",
					TZ: "UTC"
				}
			}
		});
		const startTime = stdout.trim();
		if (!startTime || isWindows && !/^\d+$/.test(startTime)) return;
		return `${process.platform}:${startTime}`;
	} catch {
		return;
	}
}
// src/node/commandLock.ts
function getCommandLockUrls(urls) {
	return urls ? {
		local: [...urls.local],
		network: [...urls.network]
	} : null;
}
function isCommandLockRecord(value) {
	if (typeof value !== "object" || value == null) return false;
	const record = value;
	return (record.command === "dev" || record.command === "preview" || record.command === "build") && typeof record.root === "string" && (typeof record.configFile === "string" || record.configFile == null) && typeof record.mode === "string" && typeof record.pid === "number" && Number.isInteger(record.pid) && record.pid > 0 && (record.startTime === void 0 || typeof record.startTime === "string" && record.startTime.length > 0) && (record.urls == null || typeof record.urls === "object" && Array.isArray(record.urls?.local) && record.urls.local.every((url) => typeof url === "string") && Array.isArray(record.urls.network) && record.urls.network.every((url) => typeof url === "string"));
}
function isSameCommand(first, second) {
	return first.command === second.command && first.root === second.root && first.configFile === second.configFile && first.mode === second.mode;
}
function isProcessAlive(pid) {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		return error.code !== "ESRCH";
	}
}
function removeFile(file) {
	try {
		fs.unlinkSync(file);
	} catch {}
}
async function scanCommandLocks(lockDir, currentRecord) {
	let files;
	try {
		files = fs.readdirSync(lockDir);
	} catch {
		return;
	}
	for (const file of files) {
		if (!file.endsWith(".json")) continue;
		const lockPath = path.resolve(lockDir, file);
		let record;
		try {
			const parsed = JSON.parse(fs.readFileSync(lockPath, "utf8"));
			if (!isCommandLockRecord(parsed)) continue;
			record = parsed;
		} catch {
			continue;
		}
		if (!isProcessAlive(record.pid)) {
			removeFile(lockPath);
			continue;
		}
		if (!isSameCommand(record, currentRecord)) continue;
		if (record.startTime) {
			const actualStartTime = record.pid === process.pid ? currentRecord.startTime : await getProcessStartTime(record.pid);
			if (actualStartTime && actualStartTime !== record.startTime) {
				removeFile(lockPath);
				continue;
			}
		}
		if (record.pid === process.pid) continue;
		const primaryUrl = record.urls?.local[0] ?? record.urls?.network[0];
		const location = primaryUrl ? ` at ${primaryUrl}` : "";
		throw new Error(`Found another Vite ${record.command} process for this project${location} (PID ${record.pid}).\nPass --bypass-lock to bypass this check.`);
	}
}
function createCommandLockController(command) {
	const ownedPaths = /* @__PURE__ */ new Set();
	let currentPath;
	let cleanupRegistered = false;
	let checkDuplicates = true;
	let released = false;
	let generation = 0;
	let processStartTime;
	function onExit() {
		release();
	}
	function onSigint() {
		releaseAndResendSignal("SIGINT");
	}
	function onSigterm() {
		releaseAndResendSignal("SIGTERM");
	}
	function releaseAndResendSignal(signal) {
		release();
		try {
			process.kill(process.pid, signal);
		} catch {
			process.exit(signal === "SIGINT" ? 130 : 143);
		}
	}
	function registerCleanup() {
		if (cleanupRegistered) return;
		cleanupRegistered = true;
		process.once("exit", onExit);
		process.once("SIGINT", onSigint);
		if (command === "build") process.once("SIGTERM", onSigterm);
	}
	function unregisterCleanup() {
		if (!cleanupRegistered) return;
		cleanupRegistered = false;
		process.off("exit", onExit);
		process.off("SIGINT", onSigint);
		if (command === "build") process.off("SIGTERM", onSigterm);
	}
	function unpublish() {
		generation++;
		unregisterCleanup();
		for (const lockPath of ownedPaths) removeFile(lockPath);
		ownedPaths.clear();
		currentPath = void 0;
	}
	async function publish(config, urls) {
		if (released) return;
		const publishGeneration = generation;
		const startTime = await (processStartTime ??= getProcessStartTime(process.pid));
		const record = {
			command,
			root: config.root,
			configFile: config.configFile ?? null,
			mode: config.mode,
			pid: process.pid,
			startTime,
			urls: getCommandLockUrls(urls)
		};
		const serialized = `${JSON.stringify(record, null, 2)}\n`;
		const lockDir = path.resolve(config.cacheDir, "lock");
		const lockPath = path.resolve(lockDir, `${getHash(serialized, 16)}.json`);
		if (lockPath === currentPath) return;
		if (checkDuplicates) {
			await scanCommandLocks(lockDir, record);
			checkDuplicates = false;
		}
		const tempPath = `${lockPath}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`;
		try {
			await fsp.mkdir(lockDir, { recursive: true });
			await fsp.writeFile(tempPath, serialized, { flag: "wx" });
			await fsp.rename(tempPath, lockPath);
		} catch {
			removeFile(tempPath);
			return;
		}
		if (released || publishGeneration !== generation) {
			if (currentPath !== lockPath) removeFile(lockPath);
			return;
		}
		const previousPath = currentPath;
		currentPath = lockPath;
		ownedPaths.add(lockPath);
		registerCleanup();
		if (previousPath && previousPath !== lockPath) {
			removeFile(previousPath);
			ownedPaths.delete(previousPath);
		}
	}
	function release() {
		if (released) return;
		released = true;
		unpublish();
	}
	return {
		publish,
		unpublish,
		release
	};
}
async function createCommandLock(config, command, urls) {
	const controller = createCommandLockController(command);
	await controller.publish(config, urls);
	return controller;
}
function commandLockPlugin() {
	let controller;
	async function configureServer(server) {
		await controller.publish(server.config, null);
		server.httpServer?.once("listening", () => {
			controller.publish(server.config, server.resolvedUrls);
		});
	}
	return {
		name: "vite:command-lock",
		apply: "serve",
		config(_config, { isPreview }) {
			controller ??= createCommandLockController(isPreview ? "preview" : "dev");
		},
		configureServer,
		configurePreviewServer: configureServer,
		closeServer({ reason }) {
			if (reason === "close") controller.release();
			else controller.unpublish();
		},
		closePreviewServer() {
			controller.release();
		}
	};
}
// src/node/cli.ts
function checkNodeVersion(nodeVersion) {
	const currentVersion = nodeVersion.split(".");
	const major = parseInt(currentVersion[0], 10);
	const minor = parseInt(currentVersion[1], 10);
	return major === 20 && minor >= 19 || major === 22 && minor >= 12 || major > 22;
}
if (!checkNodeVersion(process.versions.node)) console.warn(import_picocolors.default.yellow(`You are using Node.js ${process.versions.node}. Vite requires Node.js version 20.19+ or 22.12+. Please upgrade your Node.js version.`));
const cli = cac("vite");
let profileSession = global.__vite_profile_session;
let profileCount = 0;
const stopProfiler = (log) => {
	if (!profileSession) return;
	return new Promise((res, rej) => {
		profileSession.post("Profiler.stop", (err, { profile }) => {
			if (!err) {
				const name = global.__vite_profile_name ?? "vite-profile";
				const count = profileCount++;
				const fileName = count === 0 ? name : `${name}-${count}`;
				const outPath = path.resolve(`./${fileName}.cpuprofile`);
				fs.writeFileSync(outPath, JSON.stringify(profile));
				log(import_picocolors.default.yellow(`CPU profile written to ${import_picocolors.default.white(import_picocolors.default.dim(outPath))}`));
				profileSession = void 0;
				res();
			} else rej(err);
		});
	});
};
const filterDuplicateOptions = (options) => {
	for (const [key, value] of Object.entries(options)) if (Array.isArray(value)) options[key] = value.at(-1);
};
/**
* removing global flags before passing as command specific sub-configs
*/
function cleanGlobalCLIOptions(options) {
	const ret = { ...options };
	delete ret["--"];
	delete ret.c;
	delete ret.config;
	delete ret.base;
	delete ret.l;
	delete ret.logLevel;
	delete ret.clearScreen;
	delete ret.configLoader;
	delete ret.profile;
	delete ret.d;
	delete ret.debug;
	delete ret.f;
	delete ret.filter;
	delete ret.m;
	delete ret.mode;
	delete ret.bypassLock;
	delete ret.force;
	delete ret.w;
	if ("sourcemap" in ret) {
		const sourcemap = ret.sourcemap;
		ret.sourcemap = sourcemap === "true" ? true : sourcemap === "false" ? false : ret.sourcemap;
	}
	if ("watch" in ret) ret.watch = ret.watch ? {} : void 0;
	return ret;
}
/**
* removing builder flags before passing as command specific sub-configs
*/
function cleanBuilderCLIOptions(options) {
	const ret = { ...options };
	delete ret.app;
	return ret;
}
/**
* host may be a number (like 0), should convert to string
*/
const convertHost = (v) => {
	if (typeof v === "number") return String(v);
	return v;
};
/**
* base may be a number (like 0), should convert to empty string
*/
const convertBase = (v) => {
	if (v === 0) return "";
	return v;
};
cli.option("-c, --config <file>", `[string] use specified config file`).option("--base <path>", `[string] public base path (default: /)`, { type: [convertBase] }).option("-l, --logLevel <level>", `[string] info | warn | error | silent`).option("--clearScreen", `[boolean] allow/disable clear screen when logging`).option("--configLoader <loader>", `[string] use 'bundle' to bundle the config with Rolldown, or 'native' to load using the native runtime (default: bundle)`).option("--profile [name]", `[boolean | string] start built-in Node.js inspector`).option("-d, --debug [feat]", `[string | boolean] show debug logs`).option("-f, --filter <filter>", `[string] filter debug logs`).option("-m, --mode <mode>", `[string] set env mode`).option("--bypass-lock", `[boolean] disable process locks`);
cli.command("[root]", "start dev server").alias("serve").alias("dev").option("--host [host]", `[string] specify hostname`, { type: [convertHost] }).option("--port <port>", `[number] specify port`).option("--open [path]", `[boolean | string] open browser on startup`).option("--cors", `[boolean] enable CORS`).option("--strictPort", `[boolean] exit if specified port is already in use`).option("--force", `[boolean] force the optimizer to ignore the cache and re-bundle`).option("--experimentalBundle", `[boolean] use experimental full bundle mode (this is highly experimental)`).action(async (root, options) => {
	filterDuplicateOptions(options);
	const { createServer } = await import("./chunks/node.js").then((n) => n.P);
	try {
		const server = await createServer({
			root,
			base: options.base,
			mode: options.mode,
			configFile: options.config,
			configLoader: options.configLoader,
			logLevel: options.logLevel,
			clearScreen: options.clearScreen,
			plugins: options.bypassLock ? [] : [commandLockPlugin()],
			server: cleanGlobalCLIOptions(options),
			forceOptimizeDeps: options.force,
			experimental: { bundledDev: options.experimentalBundle }
		});
		if (!server.httpServer) throw new Error("HTTP server not available");
		await server.listen();
		const info = server.config.logger.info;
		const modeString = options.mode && options.mode !== "development" ? `  ${import_picocolors.default.bgGreen(` ${import_picocolors.default.bold(options.mode)} `)}` : "";
		const viteStartTime = global.__vite_start_time ?? false;
		const startupDurationString = viteStartTime ? import_picocolors.default.dim(`ready in ${import_picocolors.default.reset(import_picocolors.default.bold(Math.ceil(performance.now() - viteStartTime)))} ms`) : "";
		const hasExistingLogs = process.stdout.bytesWritten > 0 || process.stderr.bytesWritten > 0;
		info(`\n  ${import_picocolors.default.green(`${import_picocolors.default.bold("VITE")} v${VERSION}`)}${modeString}  ${startupDurationString}\n`, { clear: !hasExistingLogs });
		server.printUrls();
		const customShortcuts = [];
		if (profileSession) customShortcuts.push({
			key: "p",
			description: "start/stop the profiler",
			async action(server) {
				if (profileSession) await stopProfiler(server.config.logger.info);
				else {
					const inspector = await import("node:inspector").then((r) => r.default);
					await new Promise((res) => {
						profileSession = new inspector.Session();
						profileSession.connect();
						profileSession.post("Profiler.enable", () => {
							profileSession.post("Profiler.start", () => {
								server.config.logger.info("Profiler started");
								res();
							});
						});
					});
				}
			}
		});
		server.bindCLIShortcuts({
			print: true,
			customShortcuts
		});
	} catch (e) {
		const logger = createLogger(options.logLevel);
		logger.error(import_picocolors.default.red(`error when starting dev server:\n${inspect(e)}`), { error: e });
		await stopProfiler(logger.info);
		process.exit(1);
	}
});
cli.command("build [root]", "build for production").option("--target <target>", `[string] transpile target (default: 'baseline-widely-available')`).option("--outDir <dir>", `[string] output directory (default: dist)`).option("--assetsDir <dir>", `[string] directory under outDir to place assets in (default: assets)`).option("--assetsInlineLimit <number>", `[number] static asset base64 inline threshold in bytes (default: 4096)`).option("--ssr [entry]", `[string] build specified entry for server-side rendering`).option("--sourcemap [output]", `[boolean | "inline" | "hidden"] output source maps for build (default: false)`).option("--minify [minifier]", "[boolean | \"oxc\" | \"terser\" | \"esbuild\"] enable/disable minification, or specify minifier to use (default: oxc)").option("--manifest [name]", `[boolean | string] emit build manifest json`).option("--ssrManifest [name]", `[boolean | string] emit ssr manifest json`).option("--emptyOutDir", `[boolean] force empty outDir when it's outside of root`).option("-w, --watch", `[boolean] rebuilds when modules have changed on disk`).option("--app", `[boolean] same as \`builder: {}\``).action(async (root, options) => {
	filterDuplicateOptions(options);
	const buildOptions = cleanGlobalCLIOptions(cleanBuilderCLIOptions(options));
	try {
		const builder = await createBuilder({
			root,
			base: options.base,
			mode: options.mode,
			configFile: options.config,
			configLoader: options.configLoader,
			logLevel: options.logLevel,
			clearScreen: options.clearScreen,
			build: buildOptions,
			...options.app ? { builder: {} } : {}
		}, null);
		if (!options.bypassLock) await createCommandLock(builder.config, "build", null);
		await builder.buildApp();
		await builder.runDevTools();
	} catch (e) {
		createLogger(options.logLevel).error(import_picocolors.default.red(`error during build:\n${inspect(e)}`), { error: e });
		process.exit(1);
	} finally {
		await stopProfiler((message) => createLogger(options.logLevel).info(message));
	}
});
cli.command("optimize [root]", "pre-bundle dependencies (deprecated, the pre-bundle process runs automatically and does not need to be called)").option("--force", `[boolean] force the optimizer to ignore the cache and re-bundle`).action(async (root, options) => {
	filterDuplicateOptions(options);
	const { resolveConfig } = await import("./chunks/node.js").then((n) => n.f);
	const { optimizeDeps } = await import("./chunks/node.js").then((n) => n.j);
	try {
		await optimizeDeps(await resolveConfig({
			root,
			base: options.base,
			configFile: options.config,
			configLoader: options.configLoader,
			logLevel: options.logLevel,
			mode: options.mode
		}, "serve"), options.force, true);
	} catch (e) {
		createLogger(options.logLevel).error(import_picocolors.default.red(`error when optimizing deps:\n${inspect(e)}`), { error: e });
		process.exit(1);
	}
});
cli.command("preview [root]", "locally preview production build").option("--host [host]", `[string] specify hostname`, { type: [convertHost] }).option("--port <port>", `[number] specify port`).option("--strictPort", `[boolean] exit if specified port is already in use`).option("--open [path]", `[boolean | string] open browser on startup`).option("--outDir <dir>", `[string] output directory (default: dist)`).action(async (root, options) => {
	filterDuplicateOptions(options);
	const { preview } = await import("./chunks/node.js").then((n) => n.C);
	try {
		const server = await preview({
			root,
			base: options.base,
			configFile: options.config,
			configLoader: options.configLoader,
			logLevel: options.logLevel,
			mode: options.mode,
			plugins: options.bypassLock ? [] : [commandLockPlugin()],
			build: { outDir: options.outDir },
			preview: {
				port: options.port,
				strictPort: options.strictPort,
				host: options.host,
				open: options.open
			}
		});
		server.printUrls();
		server.bindCLIShortcuts({ print: true });
	} catch (e) {
		createLogger(options.logLevel).error(import_picocolors.default.red(`error when starting preview server:\n${inspect(e)}`), { error: e });
		process.exit(1);
	} finally {
		await stopProfiler((message) => createLogger(options.logLevel).info(message));
	}
});
cli.help();
cli.version(VERSION);
cli.parse();
export { stopProfiler };
