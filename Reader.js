// @flow

import React, { Component } from "react";
import Native, { View, FlatList, Linking, AsyncStorage, Alert, Dimensions, ScrollView } from "react-native";
import { Container, Content, Header, Left, Body, Right, Button, Icon, Title, Text, List, ListItem, Footer, FooterTab, Spinner } from "native-base";
import { RecyclerListView, DataProvider, LayoutProvider } from "recyclerlistview";

import Store from "react-native-simple-store";
import Tts from "react-native-tts";
import Fs from "react-native-fs";

import { TextDecoder } from "text-encoding";

import { base64ToRaw, rawToArray } from "./bit";
import { startAsync } from "./prom";

function sentenceKeyExtractor(text, index) {
	return text + "@" + index;
}

const settings = {
	splitRegExp: " *[\\n\\r]+ *",
	removeEmptyLines: true,
};


/*:: type Props = {
	
} */

/*:: type State = {
	loading?: string,
	sentences?: Array<string>
} */

export default class Reader extends Component/*:: <Props, State> */ {
	constructor(props/*: Props */) {
		super(props);
		
		this.dataProvider = new DataProvider((r1, r2) => {
			return r1 !== r2;
		});
		
		const { width } = Dimensions.get("window");
		this.layoutProvider = new LayoutProvider(() => 0, (_, dim, index) => {
			dim.width = width;
			dim.height = this.getSentenceHeight(index);
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

	async parseText(text/*: string */) {
		this.setState({ loading: "Parsing text..." });
		var sentences = await startAsync/*:: <Array<string>> */(resolve => {
			var lines = text.split(new RegExp(settings.splitRegExp));
			if (settings.removeEmptyLines) lines = lines.filter(x => x);
			resolve(lines.map(text => ({ text })));
		});

		this.setState({ loading: "Measuring lines..." });
		const measuring = await startAsync(resolve => {
			resolve(sentences.map(x => {
				x.promise = new Promise(r => x.resolve = r);
				return x;
			}));
		});
		this.setState({ measuring });
		this.measuringResults = await Promise.all(measuring.map(x => x.promise));
		console.log(this.measuringResults);

		this.setState({ 
			loading: undefined, 
			measuring: undefined, 
			dataProvider: this.dataProvider.cloneWithRows(sentences) 
		});
		// this.listRef.scrollToIndex(100, true);
	}

	getSentenceHeight(index) {
		return this.measuringResults[index] || 20;
	}

	renderSentence(type, { text }) {
		return <Native.Text>{text}</Native.Text>
	}

	render() {
		const state = this.state;
		const props = this.props;

		return <Container>
			<Header>
				<Left><Button transparent onPress={props.onClose}>
					<Icon name="arrow-back" />
				</Button></Left>
				<Body><Title>{props.book.title}</Title></Body>
				<Right><Button transparent><Icon name="menu" /></Button></Right>
			</Header>
			<View style={{ flex: 1 }}>
				{state.measuring ? <ScrollView>{state.measuring.map((x, i) => {
					return <View key={x.text + "@" + i} onLayout={({ nativeEvent: { layout: { height } } }) => {
						setTimeout(() => {
							x.resolve(height);
						}, 0);
					}}>{this.renderSentence(0, x)}</View>
				})}</ScrollView> : state.loading ? <Spinner /> : <RecyclerListView
					ref={ref => this.listRef = ref}
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