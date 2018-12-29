// @flow

import React, { Component } from "react";
import Native, { View, FlatList, Linking, AsyncStorage, Alert, Dimensions, ScrollView, TouchableOpacity } from "react-native";
import { Container, Content, Header, Left, Body, Right, Button, Icon, Title, Text, List, ListItem, Footer, FooterTab, Spinner } from "native-base";
import { RecyclerListView, DataProvider, LayoutProvider } from "recyclerlistview";

import Store from "react-native-simple-store";
import Tts from "react-native-tts";
import Fs, { stat } from "react-native-fs";
import MeasureText from 'react-native-measure-text';
import TextSize from 'react-native-text-size'

import He from "he";
import { TextDecoder } from "text-encoding";
import update from 'immutability-helper';

import { base64ToRaw, rawToArray } from "./bit";
import { startAsync } from "./prom";
import { toFullWidth, toHalfWidth } from "./fullWidth"

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
	fontStyle?: string
|} */

/*:: type VoiceStyle = {|
	voiceId?: string,
	pitch?: number,
	rate?: number
|} */

const settings = {
	// preprocess
	decodeHtml: true,
	toFullWidth: false,
	toHalfWidth: false,
	preEdits: [
		{ regexp: "★☆.*☆★", replace: "" },
		{ regexp: " *([a-zA-Z0-9 ]+) *", replace: " $1 " },
		// { regexp: "\\!", replace: "! " },
		// { regexp: "\\?", replace: "? " },
	],

	// split
	splitRegexp: " *[\\n\\r]+ *",
	removeEmptyLines: true,
	measuringOffset: 0,  // doesn't quite work...

	// edit
	edits: [
		{ regexp: "^", replace: "　　" },
		{ regexp: " *(“.+?”) *", replace: " $1 " },
		{ regexp: " *(‘.+?’) *", replace: " $1 " },
	],
	
	// rendering
	textStyle: {
		color: "#F7F7EF",
		fontSize: 18,
		fontWeight: "normal",
		fontFamily: "Roboto",
		fontStyle: "normal"
	},
	textPaints: [
		// { regexp: "第.+[卷章].+", style: { fontWeight: "bold", color: "#65D9EF" } },
		// { regexp: "“.+?”", style: { color: "#E6DB73" } },
		// { regexp: "「.+?」", style: { color: "#E6DB73" } }	,
		// { regexp: "[a-zA-Z ]+", style: { color: "#B4E1D2" } },
		// { regexp: "[0-9]+", style: { color: "#AE81FF" } },
		// // { regexp: "第?[零〇一二三四五六七八九十百千万亿兆]+", style: { color: "#AE81FF" } },
		// { regexp: "《.+?》", style: { color: "#F92671" } },
		// { regexp: "【.+?】", style: { color: "#F92671" } },
		// { regexp: "『.+?』", style: { color: "#F92671" } },
		// { regexp: "[我你他她它]们?", style: { fontStyle: "italic" } },
		// { regexp: "（.+?）", style: { color: "#74705E" } },
		// { regexp: "\\(.+?\\)", style: { color: "#74705E" } },
	],
	
	lineSelectedColor: "#ffffff44",
	lineScheduledColor: "#00ccff44",
	lineReadingColor: "#ffcccc55",
	lineReadColor: "#ff008822",
	pageColor: "#000",
	
	linePaddingX: 9,
	linePaddingY: 10,
	
	// reading
	scheduleLength: 4,
	voiceStyle: {
		// voiceId: "yue-hk-x-jar-local",
		voiceId: "cmn-cn-x-ssa-local",
		pitch: 1.1,
		rate: 1
	},
	voicePaints: [
		// { regexp: "[我你他她它]们?", style: { pitch: .8 } },
		// { regexp: "“.+?”", style: { pitch: 1.2 } },
		// { regexp: "‘.+?’", style: { voiceId: "yue-hk-x-jar-local" } },
		{ regexp: "[a-zA-Z][a-zA-Z0-9 ]*", style: { voiceId: "en-us-x-sfg#female_1-local" } },
	],
	voiceEdits: [
		{ regexp: "[“”‘’（）\\(\\)]", replace: "" },
		{ regexp: "(.)…+", replace: "$1$1。" },
	]
};

const NONE = "NONE";
const SELECTED = "SELECTED";
const SCHEDULED = "SCHEDULED";
const READING = "READING";
const READ = "READ";

function edit(text/*: string */, edits/*: Array<Edit> */) /*: string */ {
	edits.forEach(e => text = text.replace(new RegExp(e.regexp, "g"), e.replace));
	return text;
}

/*:: type Segment<T> = {|
	text: string,
	style: T
|} */

function paint/*:: <T> */(text/*: string */, style/*: T */, paints/*: Array<Paint<T>> */) /*: Array<Segment<T>> */ {
	var segments = [ { text, style } ];
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
	return {
		iosVoiceId: voiceStyle.voiceId,
		androidParams: { KEY_PARAM_UTTERANCE_ID: voiceStyle.voiceId },
	};
}

function setDefaultByVoiceStyle(voiceStyle/*: VoiceStyle */) {
	if (voiceStyle.voiceId) Tts.setDefaultVoice(voiceStyle.voiceId);
	if (voiceStyle.pitch) Tts.setDefaultPitch(voiceStyle.pitch);
	if (voiceStyle.rate) Tts.setDefaultRate(voiceStyle.rate);
}

/*:: type Props = {|
	book: Book,
	basePath: string,
	onClose: (string, number, number) => any
|} */

/*:: type State = {|
	loading?: string,
	lines?: Array<string>,
	dataProvider?: DataProvider,
	isPlaying?: boolean,
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
				|| line1.isRead !== line2.isRead;
		}); 
		
		const { width } = Dimensions.get("window");
		this.screenWidth = width;
		this.lineLayoutProvider = new LayoutProvider(() => 0, (_, dim, index) => {
			dim.width = width;
			dim.height = (this.measuringResults[index] || settings.textStyle.fontSize) + settings.linePaddingY * 2;
		});
		this.state = { dataProvider: this.lineDataProvider.cloneWithRows([]) };

		this.selectedIndex = props.book.viewingIndex;
	}

	componentDidMount() {
		this.init();
	}

	async init() {
		const props = this.props;

		this.setState({ loading: "Loading file..." });
		const base64 = await Fs.readFile(props.basePath + props.book.hash, "base64");

		this.setState({ loading: "Decoding text..." });
		const text = await startAsync/*:: <string> */(resolve => {
			const array = rawToArray(base64ToRaw(base64));
			resolve(new TextDecoder(props.book.encoding).decode(array));
		});

		this.parseText(text);
	}

	async parseText(text/*: string */) {
		this.setState({ loading: "Preprocessing text..." });
		text = await startAsync/*:: <string> */(resolve => {
			if (settings.decodeHtml) text = He.decode(text);
			if (settings.toFullWidth) text = toFullWidth(text);
			if (settings.toHalfWidth) text = toHalfWidth(text);
			resolve(edit(text, settings.preEdits));
		});
		
		this.setState({ loading: "Splitting text..." });
		const texts /*: Array<string> */ = await startAsync/*:: <Array<string>> */(resolve => {
			var texts = text.split(new RegExp(settings.splitRegexp));
			if (settings.removeEmptyLines) texts = texts.filter(x => x);
			resolve(texts);
		});
		
		this.setState({ loading: "Editing texts..." });
		const edited = await startAsync/*:: <Array<string>> */(resolve => {
			resolve(texts.map(text => edit(text, settings.edits)))
		});
		
		const lines = edited.map((text, index) => ({
			text, index,
			isSelected: index === this.props.book.viewingIndex, isReading: false, isRead: false,
			lastSpeechId: 0
		}));
		this.lines = lines;

		this.setState({ loading: "Measuring lines..." });
		// this.measuringResults = await MeasureText.heights({
		// 	...settings.textStyle,
		// 	texts,
		// 	width: this.screenWidth - settings.linePaddingX * 2 - settings.measuringOffset,
		// });
		this.measuringResults = await TextSize.flatHeights({
			...settings.textStyle,
			text: texts,
			width: this.screenWidth - settings.linePaddingX * 2 - settings.measuringOffset,
		});

		this.setState({
			loading: "Waiting for TTS...",
			dataProvider: this.lineDataProvider.cloneWithRows(lines),
		});

		try {
			await Tts.getInitStatus();
		} catch(err) {
			if (err.code === 'no_engine') {
				Tts.requestInstallEngine();
				return;
			}
		}
		Tts.addEventListener("tts-start", this.onTtsStart.bind(this));
		Tts.addEventListener("tts-finish", this.onTtsFinish.bind(this));
		Tts.addEventListener("tts-cancel", this.onTtsCancel.bind(this));
		this.setState({ loading: undefined, isPlaying: false });
		
		// test
		// Tts.voices().then(v => console.log(v.filter(x => !x.notInstalled && !x.networkConnectionRequired)));
		this.onPlayButtonPress();
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
		var backgroundColor = undefined;
		if (line.isReading) backgroundColor = settings.lineReadingColor;
		else if (line.isSelected) backgroundColor = settings.lineSelectedColor;
		else if (line.isRead) backgroundColor = settings.lineReadColor;
		else if (line.voiceSegments) backgroundColor = settings.lineScheduledColor;

		// paint as needed
		if (!line.textSegments) line.textSegments = paint/*:: <TextStyle> */(line.text, settings.textStyle, settings.textPaints)

		return <TouchableOpacity onPress={() => this.onLinePress(line)}>
			<Native.Text style={{
				paddingHorizontal: settings.linePaddingX,
				paddingVertical: settings.linePaddingY,
				backgroundColor: backgroundColor,
			}}>{line.textSegments.map(({ text, style }, i) => <Native.Text key={i.toString()} style={style}>{text}</Native.Text>)}</Native.Text>
		</TouchableOpacity>;
	}

	onBackButtonPress() {
		const viewingIndex = this.listRef.current.findApproxFirstVisibleIndex();
		const viewingLine = this.lines[viewingIndex].text.trim();
		this.props.onClose(viewingLine, viewingIndex, this.lines.length);
	}

	onPlayButtonPress() {
		if (!this.state.isPlaying) {
			this.lastScheduledIndex = Math.min(this.lines.length - 1, this.selectedIndex + settings.scheduleLength);

			Tts.setDefaultRate(settings.voiceStyle.rate);
			Tts.setDefaultPitch(settings.voiceStyle.pitch);

			// if (this.listRef.current) this.listRef.current.scrollToIndex(this.selectedIndex);

			const spec = {};
			this.currentSpeechId = 0;
			var lastSpeechId = -1;
			for (var i = this.selectedIndex; i <= this.lastScheduledIndex; i += 1) {
				const segments = paint(this.lines[i].text, settings.voiceStyle, settings.voicePaints);
				var draft = "";
				segments.forEach(s => {
					s.text = s.text.trim();
					if (!!s.text) {
						const edited = edit(s.text, settings.voiceEdits);
						draft += "[" + edited + "] ";
						console.log(edited, s.style);
						Tts.speak("　　“    " + edited + "                     ", voiceStyleToParam(s.style));
					}
				});
				lastSpeechId += segments.length;
				spec[i] = { $merge: { status: SCHEDULED, draft, lastSpeechId } };
			}
			this.updateLinesAndSetState(spec, { isPlaying: true });
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
		return this.listRef.current && Math.abs(this.listRef.current.findApproxFirstVisibleIndex() - this.selectedIndex) < 3;
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

		this.currentSpeechId += 1;
		console.log(this.currentSpeechId, this.lines[this.selectedIndex].lastSpeechId);
		if (this.currentSpeechId > this.lines[this.selectedIndex].lastSpeechId) {
			if (this.selectedIndex !== this.lastScheduledIndex) {
				this.updateLinesAndSetState({ 
					[this.selectedIndex]: { isRead: { $set: true }, isReading: { $set: false }, isSelected: { $set: false } },
					[this.selectedIndex + 1]: { isReading: { $set: true }, isSelected: { $set: true } }
				});
			} else {  // last one
				this.updateLinesAndSetState({
					[this.selectedIndex]: { isRead: { $set: true }, isReading: { $set: false }, isSelected: { $set: false } },
					[this.selectedIndex + 1]: { isSelected: { $set: true } }
				}, { isPlaying: false });
			}
			this.selectedIndex += 1;
		}
	}

	onTtsCancel() {
		console.log("onTtsCancel");

		const spec = {};
		spec[this.selectedIndex] = { isReading: { $set: false } };
		this.updateLinesAndSetState(spec, { isPlaying: false });
	}
	
	render() {
		const state = this.state;
		const props = this.props;
		
		return <Container>
			<Header>
				<Left><Button transparent onPress={this.onBackButtonPress.bind(this)}>
					<Icon name="close" />
				</Button></Left>
				<Body><Title>{props.book.title}</Title></Body>
				<Right><Button transparent onPress={() => {
					this.listRef.current.scrollToIndex(98, false);
					this.listRef.current.scrollToIndex(100, true);
					// this.listRef.current.scr
					// this.lines[100] = { ...this.lines[100], text: this.lines[0].text + "@" };
					// this.lines[100] += "@";
					this.setState({ dataProvider: this.lineDataProvider.cloneWithRows(this.lines) })
				}}><Icon name="menu" /></Button></Right>
			</Header>
			<View style={{ flex: 1, backgroundColor: settings.pageColor }}>
				{state.loading ? <Spinner /> : <RecyclerListView
					ref={this.listRef}
					layoutProvider={this.lineLayoutProvider}
					dataProvider={state.dataProvider}
					rowRenderer={this.renderLine.bind(this)}
					initialRenderIndex={props.book.viewingIndex}
				/>}
			</View>
			<Footer>
				{state.loading ? <FooterTab>
					<Button active><Text>{state.loading}</Text></Button>
				</FooterTab> : <FooterTab>
					{/* <Button><Icon type="MaterialIcons" name="stop" /></Button> */}
					<Button active onPress={this.onPlayButtonPress.bind(this)}><Icon type="MaterialIcons" name={state.isPlaying ? "pause" : "play-arrow"} /></Button>
					{/* <Button><Icon type="MaterialIcons" name="settings-voice" /></Button> */}
				</FooterTab>}
			</Footer>
		</Container>
	}
}