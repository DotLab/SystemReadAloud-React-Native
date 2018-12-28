// @flow

import React, { Component } from "react";
import Native, { View, FlatList, Linking, AsyncStorage, Alert, Dimensions, ScrollView } from "react-native";
import { Container, Content, Header, Left, Body, Right, Button, Icon, Title, Text, List, ListItem, Footer, FooterTab, Spinner } from "native-base";
import { RecyclerListView, DataProvider, LayoutProvider } from "recyclerlistview";

import Store from "react-native-simple-store";
import Tts from "react-native-tts";
import Fs from "react-native-fs";
import MeasureText from 'react-native-measure-text';
import TextSize from 'react-native-text-size'

import He from "he";
import { TextDecoder } from "text-encoding";

import { base64ToRaw, rawToArray } from "./bit";
import { startAsync } from "./prom";
import { toFullWidth, toHalfWidth } from "./fullWidth"


const settings = {
	// preprocess
	decodeHtml: true,
	toFullWidth: false,
	toHalfWidth: false,
	preEdits: [
		{ regexp: "★☆.*☆★", replace: "" },
		{ regexp: " *([a-zA-Z0-9 ]+) *", replace: " $1 " },
		{ regexp: "\\!", replace: "! " },
		{ regexp: "\\?", replace: "? " },
	],

	// split
	splitRegexp: " *[\\n\\r]+ *",
	removeEmptyLines: true,

	// edit
	edits: [
		{ regexp: "^", replace: "　　" },
		{ regexp: " *(“.+?”) *", replace: " $1 " },
		{ regexp: " *(‘.+?’) *", replace: " $1 " },
	],
	paints: [
		{ regexp: "第.+[卷章].+", style: { fontWeight: "bold", color: "#65D9EF" } },
		{ regexp: "“.+?”", style: { color: "#E6DB73" } },
		// { regexp: "「.+?」", style: { color: "#E6DB73" } },
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

	// rendering
	textStyle: {
		color: "#F7F7EF",
		fontSize: 18,
		fontWeight: "normal",
		fontFamily: "Roboto",
		fontStyle: "normal"
	},

	lineScheduledColor: "#022",
	lineReadingColor: "#200",
	lineReadColor: "#202",
	pageColor: "#000",

	linePaddingX: 9,
	linePaddingY: 9,
};

function edit(text, edits) {
	edits.forEach(e => text = text.replace(new RegExp(e.regexp, "g"), e.replace));
	return text;
}

function paint(text, paints) {
	var segments = [ { text, style: settings.textStyle } ];
	paints.forEach(p => {
		const re = new RegExp(p.regexp, "g");

		var newSegments = [];
		segments.forEach(({ text, style }) => {
			var i = 0, m = null;
			while (m = re.exec(text)) {
				matched = true;

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

/*:: import type { Book } from "./App" */
/*:: import type { ElementRef } from "react" */

/*:: type Props = {
	book: Book,
	basePath: string,
	onClose: () => void
} */

/*:: type State = {
	loading?: string,
	lines?: Array<string>,
	dataProvider: DataProvider
} */

/*:: type Sentence = {
	text: string,
	index: number
} */

export default class Reader extends Component /*:: <Props, State> */ {
	/*:: dataProvider: DataProvider */
	/*:: layoutProvider: LayoutProvider */
	/*:: screenWidth: number */
	/*:: lines: Array<Sentence> */
	/*:: listRef: ElementRef<RecyclerListView> */
	/*:: measuringResults: Array<number> */

	constructor(props /*: Props */) {
		super(props);

		this.listRef = React.createRef();
		
		this.lineDataProvider = new DataProvider((line1, line2) => {
			return line1.text !== line2.text;
		});
		
		const { width } = Dimensions.get("window");
		this.screenWidth = width;
		this.lineLayoutProvider = new LayoutProvider(() => 0, (_, dim, index) => {
			dim.width = width;
			dim.height = (this.measuringResults[index] || settings.fontSize) + settings.linePaddingY * 2;
		});

		this.state = { dataProvider: this.lineDataProvider.cloneWithRows([]) };
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
		this.text = text;

		this.parseText(text);
	}

	async parseText(text /*: string */) {
		this.setState({ loading: "Preprocessing text..." });
		text = await startAsync/*:: <Array<Sentence>> */(resolve => {
			if (settings.decodeHtml) text = He.decode(text);
			if (settings.toFullWidth) text = toFullWidth(text);
			if (settings.toHalfWidth) text = toHalfWidth(text);
			resolve(edit(text, settings.preEdits));
		});
		
		this.setState({ loading: "Splitting text..." });
		var texts = await startAsync(resolve => {
			var texts = text.split(new RegExp(settings.splitRegexp));
			if (settings.removeEmptyLines) texts = texts.filter(x => x);
			resolve(texts);
		});
		
		this.setState({ loading: "Editing texts..." });
		texts = await startAsync(resolve => {
			resolve(texts.map(text => edit(text, settings.edits)));
		});
		
		this.setState({ loading: "Painting lines..." });
		var lines = await startAsync(resolve => {
			resolve(texts.map((text, index) => ({
				text, index,
				segments: paint(text, settings.paints)
			})));
		});
		this.lines = lines;

		this.setState({ loading: "Measuring lines..." });
		// this.measuringResults = await MeasureText.heights({
		// 	...settings.textStyle,
		// 	texts,
		// 	width: this.screenWidth - settings.linePaddingX * 2,
		// });
		this.measuringResults = await TextSize.flatHeights({
			...settings.textStyle,
			text: texts,
			width: this.screenWidth - settings.linePaddingX * 2,
		});

		this.setState({ 
			loading: undefined,
			dataProvider: this.lineDataProvider.cloneWithRows(lines) 
		});
	}
	
	renderSentence(_ /*: number */, { segments } /*: Sentence */) {
		return <Native.Text allowFontScaling={false} style={{
			paddingHorizontal: settings.linePaddingX,
			paddingVertical: settings.linePaddingY,
			backgroundColor: settings.lineReadColor,
		}}>{
			// paint(text, settings.paints).map(({ text, style }, i) => <Native.Text key={i.toString()} style={style}>{text}</Native.Text>)
			segments.map(({ text, style }, i) => <Native.Text key={i.toString()} allowFontScaling={false} style={style}>{text}</Native.Text>)
		}</Native.Text>
	}
	
	render() {
		const state = this.state;
		const props = this.props;
		
		return <Container>
			<Header>
				<Left><Button transparent onPress={props.onClose}><Icon name="arrow-back" /></Button></Left>
				<Body><Title>{props.book.title}</Title></Body>
				<Right><Button transparent onPress={() => {
					this.listRef.current.scrollToIndex(100, false);
					// this.lines[100] = { ...this.lines[100], text: this.lines[0].text + "@" };
					// this.lines[100] += "@";
					console.log(this.lines);
					this.setState({ dataProvider: this.lineDataProvider.cloneWithRows(this.lines) })
				}}><Icon name="menu" /></Button></Right>
			</Header>
			<View style={{ flex: 1, backgroundColor: settings.pageColor }}>
				{state.loading ? <Spinner /> : <RecyclerListView
					ref={this.listRef}
					layoutProvider={this.lineLayoutProvider}
					dataProvider={state.dataProvider}
					rowRenderer={this.renderSentence}
					/>}
			</View>
			<Footer>
				<FooterTab>
					<Button active><Text>{state.loading}</Text></Button>
				</FooterTab>
			</Footer>
		</Container>
	}
}