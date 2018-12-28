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

import { TextDecoder } from "text-encoding";

import { base64ToRaw, rawToArray } from "./bit";
import { startAsync } from "./prom";
import { toFullWidth, toHalfWidth } from "./fullWidth"

const settings = {
	// preprocess
	toFullWidth: false,
	toHalfWidth: false,
	preEdits: [
		{ regexp: "★☆.*☆★", replace: "" },
	],

	// split
	splitRegexp: " *[\\n\\r]+ *",
	removeEmptyLines: true,

	// edit
	edits: [
		{ regexp: "^", replace: "　" },
		{ regexp: " *([a-zA-Z0-9 ]+) *", replace: " $1 " },
		{ regexp: " *(“.+?”) *", replace: " $1 " },
		{ regexp: "\\!", replace: "! " },
		{ regexp: "\\?", replace: "? " },
	],
	paints: [
		{ regexp: "第.+卷.+", style: { fontWeight: "bold", color: "#65D9EF" } },
		{ regexp: "“.+?”", style: { color: "#E6DB73" } },
		{ regexp: "「.+?」", style: { color: "#E6DB73" } },
		{ regexp: "[a-zA-Z0-9 ]+", style: { color: "#AE81FF" } },
		{ regexp: "《.+?》", style: { color: "#F92671" } },
		{ regexp: "『.+?』", style: { color: "#F92671" } },
		{ regexp: "[我你他她它]", style: { color: "#F92671" } },
		{ regexp: "（.+?）", style: { color: "#74705E" } },
		{ regexp: "\\(.+?\\)", style: { color: "#74705E" } },
	],

	// rendering
	textStyle: {
		fontSize: 18,
		fontWeight: "normal",
		fontFamily: "Roboto",
		color: "#F7F7EF",
	},

	pageColor: "#000",

	sentencePaddingX: 9,
	sentencePaddingY: 9,
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
	sentences?: Array<string>,
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
	/*:: sentences: Array<Sentence> */
	/*:: listRef: ElementRef<RecyclerListView> */
	/*:: measuringResults: Array<number> */

	constructor(props /*: Props */) {
		super(props);

		this.listRef = React.createRef();
		
		this.dataProvider = new DataProvider((r1, r2) => {
			return r1.text !== r2.text;
		});
		
		const { width } = Dimensions.get("window");
		this.screenWidth = width;
		this.layoutProvider = new LayoutProvider(() => 0, (_, dim, index) => {
			dim.width = width;
			dim.height = (this.measuringResults[index] || settings.fontSize) + settings.sentencePaddingY * 2;
		});

		this.state = { dataProvider: this.dataProvider.cloneWithRows([]) };
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

	async parseText(text /*: string */) {
		this.setState({ loading: "Preprocessing text..." });
		text = await startAsync/*:: <Array<Sentence>> */(resolve => {
			if (settings.toFullWidth) text = toFullWidth(text);
			if (settings.toHalfWidth) text = toHalfWidth(text);
			resolve(edit(text, settings.preEdits));
		});
		
		this.setState({ loading: "Splitting text..." });
		var lines = await startAsync(resolve => {
			var lines = text.split(new RegExp(settings.splitRegexp));
			if (settings.removeEmptyLines) lines = lines.filter(x => x);
			resolve(lines);
		});
		
		this.setState({ loading: "Edit lines..." });
		var sentences = await startAsync(resolve => {
			lines = lines.map(text => edit(text, settings.edits));
			resolve(lines.map((text, index) => ({ text, index })));
		});
		this.sentences = sentences;

		this.setState({ loading: "Measuring lines..." });
		// this.measuringResults = await MeasureText.heights({
		//  ...settings.textStyle,
		// 	texts: sentences.map(x => x.text),
		// 	width: this.screenWidth,
		// });
		this.measuringResults = await TextSize.flatHeights({
			...settings.textStyle,
			text: sentences.map(x => x.text),
			width: this.screenWidth - settings.sentencePaddingX * 2,
		});

		this.setState({ 
			loading: undefined,
			dataProvider: this.dataProvider.cloneWithRows(sentences) 
		});
	}
	
	renderSentence(_ /*: number */, { text } /*: Sentence */) {
		return <Native.Text style={{
			paddingHorizontal: settings.sentencePaddingX,
			paddingVertical: settings.sentencePaddingY,
		}}>{
			paint(text, settings.paints).map(({ text, style }, i) => <Native.Text key={text + i} style={style}>{text}</Native.Text>)
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
					this.listRef.current.scrollToIndex(100, true);
					this.sentences[0] = { ...this.sentences[0], text: this.sentences[0].text + "@" };
					console.log(this.sentences);
					this.setState({ dataProvider: this.dataProvider.cloneWithRows(this.sentences) })
				}}><Icon name="menu" /></Button></Right>
			</Header>
			<View style={{ flex: 1, backgroundColor: settings.pageColor }}>
				{state.loading ? <Spinner /> : <RecyclerListView
					ref={this.listRef}
					layoutProvider={this.layoutProvider}
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