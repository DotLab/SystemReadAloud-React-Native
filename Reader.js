// @flow

import React, { Component } from "react";
import Native, { View, FlatList, Dimensions, ScrollView, TouchableOpacity, Platform } from "react-native";
import { Container, Content, Header, Left, Body, Right, Button, Icon, Title, Text, List, ListItem, Footer, FooterTab, Spinner } from "native-base";
import { RecyclerListView, DataProvider, LayoutProvider } from "recyclerlistview";

import Tts from "react-native-tts";
import Fs from "react-native-fs";
import MeasureText from 'react-native-measure-text';
import TextSize from 'react-native-text-size'
import Store from "react-native-simple-store";


import He from "he";
import { TextDecoder } from "text-encoding";
import update from 'immutability-helper';

import { base64ToRaw, rawToArray } from "./bit";
import { startAsync } from "./prom";
import { toFullWidth, toHalfWidth } from "./fullWidth"

import TextConfigPanel from "./TextConfigPanel";
import { settings } from './settings'

const SETTINGS = 'SETTINGS';

/*:: import type { Book } from "./App" */
/*:: import type { ElementRef } from "react" */
/*:: import type { Spec } from "immutability-helper" */

/*:: type Edit = {|
	regexp: string,
	replace: string
|} */

/*:: type Paint<T> = {|
	regexp: string,
	style: T
|} */

/*:: type TextStyle = {|
	color?: string,
	fontSize?: number,
	fontWeight?: string,
	fontFamily?: string,
	fontStyle?: string,
	lineHeight?: number,
	backgroundColor?: string,
|} */

/*:: type VoiceStyle = {|
	voiceId?: string,
	pitch?: number,
	rate?: number
|} */

const TEXT_CONFIG_PANEL = "TEXT_CONFIG_PANEL";

function edit(text/*: string */, edits/*: Array<Edit> */) /*: string */ {
	edits.forEach(e => text = text.replace(new RegExp(e.regexp, "g"), e.replace));
	return text;
}

/*:: type Segment<T> = {|
	text: string,
	style: T
|} */

function paint/*:: <T> */(text/*: string */, style/*: T */, paints/*: Array<Paint<T>> */) /*: Array<Segment<T>> */ {
	var segments = [{ text, style }];
	console.log(segments)
	paints.forEach(p => {
		const re = new RegExp(p.regexp, "g");

		var newSegments = [];
		segments.forEach(({ text, style }) => {
			var i = 0, m = null;
			while (m = re.exec(text)) {
				// before match
				newSegments.push({
					text: text.substring(i, m.index),
					style,
				});

				// match
				newSegments.push({
					text: m[0],
					style: { ...style, ...p.style }
				});

				// set index
				i = m.index + m[0].length;
			}

			// after match (if any)
			newSegments.push({
				text: text.substring(i, text.length),
				style,
			});
		});

		segments = newSegments.filter(({ text }) => text);
	});
	// console.log(text, segments);
	return segments;
}

function voiceStyleToParam(voiceStyle/*: VoiceStyle */) {
	if (voiceStyle.voiceId) {
		return {
			iosVoiceId: voiceStyle.voiceId,
			androidParams: { KEY_PARAM_UTTERANCE_ID: voiceStyle.voiceId },
		};
	}
	return undefined;
}

function setTtsVoiceStyle(voiceStyle/*: VoiceStyle */) {
	// if (voiceStyle.voiceId) Tts.setDefaultVoice(voiceStyle.voiceId);
	if (voiceStyle.pitch) Tts.setDefaultPitch(voiceStyle.pitch);
	if (voiceStyle.rate) Tts.setDefaultRate(voiceStyle.rate);
}

function buildVoiceSegments(text/*: string */, voiceStyle/*: VoiceStyle */, voicePaints/*: Array<Paint<VoiceStyle>> */, voiceEdits/*: Array<Edit> */) /*: Array<Segment<VoiceStyle>> */ {
	const voiceSegments = [];
	paint(text, voiceStyle, voicePaints).forEach(s => {
		s.text = s.text.trim();
		if (s.text.length > 1) {
			s.text = edit(s.text, voiceEdits);
			voiceSegments.push(s);
		}
	});
	return voiceSegments;
}

function getValue(obj/*: ?Object */, keys/*: Array<string|number> */, def/*: any */, currentDepth/*: ?number */) /*: any */ {
	if (!obj) return def;
	else if (currentDepth === undefined || currentDepth === null) {  // direct call
		return getValue(obj, keys, def, 0);
	} else if (currentDepth >= keys.length) {  // base case
		return obj;
	} else {  // recursive
		return getValue(obj[keys[currentDepth]], keys, def, currentDepth + 1);
	}
}

/*:: type Props = {|
	book: Book,
	basePath: string,
	onClose: (string, number, number, number) => any
|} */

/*:: type State = {|
	loading?: string,
	lines?: Array<string>,
	dataProvider?: DataProvider,
	isPlaying?: boolean,
	page?: string,
	pageProps?: Object,
|} */

/*:: type Line = {|
	index: number,
	isSelected: boolean,
	isReading: boolean,
	isRead: boolean,
	text: string,
	textSegments?: Array<Segment<TextStyle>>,
	voiceSegments?: Array<Segment<VoiceStyle>>,
	lastSpeechId: number
|} */

export default class Reader extends Component /*:: <Props, State> */ {
	/*:: screenWidth: number */
	/*:: listRef: ElementRef<RecyclerListView> */

	/*:: text: string */
	/*:: lines: Array<Line> */
	/*:: lineDataProvider: DataProvider */
	/*:: lineLayoutProvider: LayoutProvider */
	/*:: measuringResults: Array<number> */

	/*:: selectedIndex: number */
	/*:: lastScheduledIndex: number */
	/*:: currentSpeechId: number */

	constructor(props/*: Props */) {
		super(props);

		this.listRef = React.createRef();

		this.lineDataProvider = new DataProvider((line1, line2) => {
			return line1.text !== line2.text
				|| line1.isSelected !== line2.isSelected
				|| line1.isReading !== line2.isReading
				|| line1.isRead !== line2.isRead
				|| line1.textSegments !== line2.textSegments
				|| line1.voiceSegments !== line2.voiceSegments;
		});

		const { width } = Dimensions.get("window");
		this.screenWidth = width;
		this.lineLayoutProvider = new LayoutProvider(() => 0, (_, dim, index) => {
			dim.width = width;
			dim.height = (this.measuringResults[index] || this.state.settings.textStyle.fontSize) + this.state.settings.linePaddingY * 2 + this.state.settings.lineSpacing;
		});
		this.state = {
			settings: {},
			tempSettings: {},
			loading: "Initializing...",
			dataProvider: this.lineDataProvider.cloneWithRows([])
		};

		this.selectedIndex = props.book.selectedIndex || 0;
	}

	componentDidMount() {
		this.init();
	}

	async init() {
		const props = this.props;

		this.setState({ loading: "Loading settings..." });
		let cachedSetting = await Store.get(SETTINGS);
		if (!cachedSetting) {
			cachedSetting = settings;
		}
		this.setState({ settings: cachedSetting, tempSettings: JSON.parse(JSON.stringify(cachedSetting)) });

		this.setState({ loading: "Loading file..." });
		const base64 = await Fs.readFile(props.basePath + props.book.hash, "base64");

		this.setState({ loading: "Decoding text..." });
		this.text = await startAsync/*:: <string> */(resolve => {
			const array = rawToArray(base64ToRaw(base64));
			resolve(new TextDecoder(props.book.encoding).decode(array));
		});

		this.parseText(this.text);
	}

	async parseText(text/*: string    */) {
		this.setState({ loading: "Preprocessing text..." });
		text = await startAsync/*:: <string> */(resolve => {
			if (this.state.settings.decodeHtml) text = He.decode(text);
			if (this.state.settings.toFullWidth) text = toFullWidth(text);
			if (this.state.settings.toHalfWidth) text = toHalfWidth(text);
			resolve(edit(text, this.state.settings.preEdits));
		});

		this.setState({ loading: "Splitting text..." });
		const texts /*: Array<string> */ = await startAsync/*:: <Array<string>> */(resolve => {
			var texts = text.split(new RegExp(this.state.settings.splitRegexp));
			texts = texts.filter(x => x && x.length > 1);
			resolve(texts);
		});

		this.setState({ loading: "Editing texts..." });
		const edited = await startAsync/*:: <Array<string>> */(resolve => {
			resolve(texts.map(text => edit(text, this.state.settings.edits)))
		});

		const lines = edited.map((text, index) => ({
			text, index,
			isSelected: index === this.selectedIndex, isReading: false, isRead: false,
			lastSpeechId: 0
		}));
		this.lines = lines;

		this.setState({ loading: "Measuring lines..." });
		// this.measuringResults = await MeasureText.heights({
		// 	...this.state.settings.textStyle,
		// 	texts,
		// 	width: this.screenWidth - this.state.settings.linePaddingX * 2 - this.state.settings.measuringOffset,
		// });
		this.measuringResults = await TextSize.flatHeights({
			...this.state.settings.textStyle,
			text: texts,
			width: this.screenWidth - this.state.settings.linePaddingX * 2 - this.state.settings.measuringOffset,
		});

		this.setState({
			loading: "Waiting for TTS...",
			dataProvider: this.lineDataProvider.cloneWithRows(lines),
		});

		try {
			await Tts.getInitStatus();
			// Tts.voices().then(v => console.log(v));
			// Tts.voices().then(v => console.log(v.filter(x => !x.notInstalled && !x.networkConnectionRequired)));
			// Tts.setDefaultLanguage("en-US");
			// Tts.setDefaultVoice("com.apple.ttsbundle.Samantha-compact");
			// Tts.setDefaultPitch(1);
			// Tts.setDefaultRate(.6);
			// Tts.speak("Hello! How do you do?");
			// Tts.speak("Hello!", { iosVoiceId: "com.apple.ttsbundle.Samantha-compact" });
		} catch (err) {
			if (err.code === 'no_engine') {
				Tts.requestInstallEngine();
			}
			throw err;
		}
		Tts.addEventListener("tts-start", this.onTtsStart.bind(this));
		Tts.addEventListener("tts-finish", this.onTtsFinish.bind(this));
		Tts.addEventListener("tts-cancel", this.onTtsCancel.bind(this));
		this.setState({ loading: undefined, isPlaying: false });

		// test
		// this.onPlayButtonPress();
		// this.onTextConfigButtonPress();
	}

	onLinePress(line/*: Line */) {
		if (!this.state.isPlaying) {
			this.updateLinesAndSetState({
				[this.selectedIndex]: { isSelected: { $set: false } },
				[line.index]: { isSelected: { $set: true } },
			});
			this.selectedIndex = line.index;
		} else {
			this.listRef.current.scrollToIndex(line.index, true);
		}
	}

	renderLine(_/*: number */, line/*: Line */) {
		var backgroundColor = this.state.settings.lineColor;
		if (line.isReading) backgroundColor = this.state.settings.lineReadingColor;
		else if (line.isSelected) backgroundColor = this.state.settings.lineSelectedColor;
		else if (line.isRead) backgroundColor = this.state.settings.lineReadColor;
		else if (line.voiceSegments) backgroundColor = this.state.settings.lineScheduledColor;

		// paint as needed
		if (!line.textSegments) line.textSegments = paint/*:: <TextStyle> */(line.text, this.state.settings.textStyle, this.state.settings.textPaints)

		return <TouchableOpacity onPress={() => this.onLinePress(line)} activeOpacity={0.8}>
			<Native.Text style={{
				paddingHorizontal: this.state.settings.linePaddingX,
				paddingVertical: this.state.settings.linePaddingY,
				backgroundColor,
			}}>{line.textSegments.map(({ text, style }, i) => <Native.Text key={i.toString()} style={style}>{text}</Native.Text>)}</Native.Text>
		</TouchableOpacity>;
	}

	onBackButtonPress() {
		Tts.removeAllListeners("tts-start");
		Tts.removeAllListeners("tts-finish");
		Tts.removeAllListeners("tts-cancel");
		Tts.stop();

		const viewingIndex = this.listRef.current.findApproxFirstVisibleIndex();
		const viewingLine = this.lines[viewingIndex].text.trim();
		this.props.onClose(viewingLine, viewingIndex, this.selectedIndex, this.lines.length - 1);
	}

	speakNextSegment() {
		console.log('curent line', this.lines[this.selectedIndex])
		console.log('curent selected index', this.selectedIndex)
		if (this.lines[this.selectedIndex].voiceSegments) {
			const segment = this.lines[this.selectedIndex].voiceSegments[this.currentSpeechId];

			console.log(this.lines[this.selectedIndex].voiceSegments, segment);
			setTtsVoiceStyle(segment.style);
			if (Platform.OS === "android") {
				Tts.speak("　　“    " + segment.text + "                     ", voiceStyleToParam(segment.style));
			} else {
				Tts.speak(segment.text, voiceStyleToParam(segment.style));
			}
		}
	}

	onPlayButtonPress() {
		if (!this.state.isPlaying) {
			this.lastScheduledIndex = Math.min(this.lines.length - 1, this.selectedIndex + this.state.settings.scheduleLength);
			// if (this.listRef.current) this.listRef.current.scrollToIndex(this.selectedIndex);

			const voiceSegments = buildVoiceSegments(this.lines[this.selectedIndex].text, this.state.settings.voiceStyle, this.state.settings.voicePaints, this.state.settings.voiceEdits);
			this.updateLinesAndSetState({
				[this.selectedIndex]: { $merge: { voiceSegments, lastSpeechId: voiceSegments.length - 1 } }
			}, { isPlaying: true });

			this.currentSpeechId = 0;
			this.speakNextSegment();
		} else {
			Tts.stop();  // set isPlay in onTtsCancel
			this.setState({ isPlaying: false });
		}
	}

	updateLinesAndSetState(spec/*: Spec<Array<Line>, any> */, state/*: ?State */) {
		this.lines = update(this.lines, spec);
		if (typeof state === "object") {
			this.setState({ dataProvider: this.lineDataProvider.cloneWithRows(this.lines), ...state });
		} else {
			this.setState({ dataProvider: this.lineDataProvider.cloneWithRows(this.lines) });
		}
	}

	willListAutoScroll() {
		return this.listRef.current && Math.abs(this.listRef.current.findApproxFirstVisibleIndex() + 1 - this.selectedIndex) <= 3;
	}

	onTtsStart() {
		console.log("onTtsStart");

		if (this.willListAutoScroll()) {
			this.listRef.current.scrollToIndex(this.selectedIndex, true);
		}
		this.updateLinesAndSetState({
			[this.selectedIndex]: { isReading: { $set: true } }
		});
	}

	onTtsFinish() {
		console.log("onTtsFinish");
		if (!this.state.isPlaying) {
			this.onTtsCancel();
			return;
		}

		this.currentSpeechId += 1;

		if (this.currentSpeechId > this.lines[this.selectedIndex].lastSpeechId) {
			this.currentSpeechId = 0;

			if (this.selectedIndex === this.lines.length - 1) {  // last line
				this.updateLinesAndSetState({
					[this.selectedIndex]: { isRead: { $set: true }, isReading: { $set: false } }
				}, { isPlaying: false });
				return;
			}

			var voiceSegments;
			do {
				voiceSegments = buildVoiceSegments(this.lines[this.selectedIndex + 1].text, this.state.settings.voiceStyle, this.state.settings.voicePaints, this.state.settings.voiceEdits);
				this.lines = update(this.lines, {
					[this.selectedIndex]: { isRead: { $set: true }, isReading: { $set: false }, isSelected: { $set: false } },
					[this.selectedIndex + 1]: { $merge: { voiceSegments, lastSpeechId: voiceSegments.length - 1 } }
				});

				if (this.selectedIndex < this.lastScheduledIndex) {
					this.updateLinesAndSetState({
						[this.selectedIndex + 1]: { isReading: { $set: true }, isSelected: { $set: true } }
					});
				} else {  // last scheduled
					this.lastScheduledIndex = 0;
					this.currentSpeechId = 0;
					this.updateLinesAndSetState({
						[this.selectedIndex + 1]: { isSelected: { $set: true } }
					}, { isPlaying: false });
				}
				this.selectedIndex += 1;
			} while (voiceSegments.length === 0 && this.selectedIndex <= this.lastScheduledIndex);
		}

		this.speakNextSegment();
	}

	onTtsCancel() {
		console.log("onTtsCancel");

		this.lastScheduledIndex = 0;
		this.currentSpeechId = 0;
		this.updateLinesAndSetState({
			[this.selectedIndex]: { isReading: { $set: false } },
		}, { isPlaying: false });
	}

	onLocButtonPress() {
		const scroll = this.listRef.current;
		if (!this.willListAutoScroll()) {
			const visibleIndex = scroll.findApproxFirstVisibleIndex();
			if (visibleIndex > this.selectedIndex) {
				scroll.scrollToIndex(this.selectedIndex + 1);
			} else {
				scroll.scrollToIndex(this.selectedIndex - 1);
			}
		}
		scroll.scrollToIndex(this.selectedIndex, true);
	}

	onTextConfigButtonPress() {
		this.setState({
			page: TEXT_CONFIG_PANEL,
			pageProps: {
				onClose: () => {
					this.setState({ page: undefined });
				}
			}
		});
	}

	onSettingChange(tempSettings) {
		this.setState({ tempSettings });
	}

	async onSettingConfirm() {
		const temp = this.state.tempSettings;
		const confirmed = JSON.parse(JSON.stringify(temp));
		this.setState({ settings: confirmed });
		await Store.update(SETTINGS, confirmed);
		this.parseText(this.text);
	}

	discardTempChange() {
		const tempSettings = JSON.parse(JSON.stringify(this.state.settings));
		this.setState({ tempSettings });
	}

	render() {
		const state = this.state;
		const props = this.props;

		switch (state.page) {
			case TEXT_CONFIG_PANEL:
				return <TextConfigPanel {...state.pageProps}
					onChange={this.onSettingChange.bind(this)}
					onApply={this.onSettingConfirm.bind(this)}
					discardTempChange={this.discardTempChange.bind(this)}
					settings={state.tempSettings} />;
		}

		var voiceStyle = getValue(this, ["lines", this.selectedIndex, "voiceSegments", this.currentSpeechId, "style"], this.state.settings.voiceStyle);
		return <Container>
			<Header>
				<Left><Button transparent onPress={this.onBackButtonPress.bind(this)}>
					<Icon name="close" />
				</Button></Left>
				<Body><Title>{props.book.title}</Title></Body>
				<Right><Button transparent onPress={this.onTextConfigButtonPress.bind(this)}><Icon name="color-palette" /></Button></Right>
			</Header>
			<View style={{ flex: 1, backgroundColor: this.state.settings.pageColor }}>
				{state.loading ? <Spinner /> : <RecyclerListView
					ref={this.listRef}
					layoutProvider={this.lineLayoutProvider}
					dataProvider={state.dataProvider}
					rowRenderer={this.renderLine.bind(this)}
					initialRenderIndex={props.book.viewingIndex || 0}
				/>}
			</View>
			<Footer>
				{state.loading ? <FooterTab>
					<Button active><Text>{state.loading}</Text></Button>
				</FooterTab> : <FooterTab>
						<Button onPress={this.onLocButtonPress.bind(this)}>
							<Text>{(this.selectedIndex / (this.lines.length - 1) * 100).toFixed(1)}%</Text>
							{this.lastScheduledIndex ? <Text numberOfLines={1}>
								{this.selectedIndex}/{this.lastScheduledIndex} ({this.lines.length - 1})
						</Text> : <Text numberOfLines={1}>
									{this.selectedIndex}/{this.lines.length - 1}
								</Text>}
						</Button>
						<Button active onPress={this.onPlayButtonPress.bind(this)}><Icon name={state.isPlaying ? "pause" : "play"} /></Button>
						<Button>
							<Text numberOfLines={1}>{voiceStyle.voiceId}</Text>
							{voiceStyle.pitch && voiceStyle.rate && <Text numberOfLines={1}>P{voiceStyle.pitch.toFixed(1)}/R{voiceStyle.rate.toFixed(1)}</Text>}
							{/* <Text numberOfLines={1}></Text> */}
						</Button>
					</FooterTab>}
			</Footer>
		</Container>
	}
}