import React, { Component } from "react";
import { Container, Content, Header, Left, Body, Right, Button, Icon, Title, Text } from "native-base";
import { View, FlatList, Linking } from "react-native";

import { decode64, decodeRaw } from "./base64";

import Tts from "react-native-tts";
const Fs = require("react-native-fs");

class AppCore {
	constructor() {
		this.currentReadingIndex = 0;
		this.nextFinishedIndex = 0;
		this.nextPlanedIndex = 0;
	}
}

export default class App extends Component {
	constructor() {
		super();

		console.log(Fs.CachesDirectoryPath);
		console.log(Fs.ExternalCachesDirectoryPath);
		console.log(Fs.DocumentDirectoryPath);
		console.log(Fs.ExternalDirectoryPath);
		console.log(Fs.ExternalStorageDirectoryPath);

		Fs.readDir(Fs.DocumentDirectoryPath).then(result => {
			console.log("Got result", result);
		});




		this.core = new AppCore();
		this.currentReadingIndex = 0;
		this.nextFinishedIndex = 0;
		this.nextPlanedIndex = 0;
		this.state = { utterances: {} };

		Tts.voices().then(voices => console.log(voices.filter(x => !x.notInstalled && !x.networkConnectionRequired)));
		Tts.setDefaultLanguage("zh-CN");

		Tts.addEventListener("tts-start", event => {
			console.log("start", event);

			const utterances = this.state.utterances;
			utterances[this.currentReadingIndex].status = "reading";
			this.setState({ utterances });
			this.currentReadingIndex += 1;
		});
		Tts.addEventListener("tts-finish", event => {
			console.log("finish", event);
			
			const utterances = this.state.utterances;
			utterances[this.nextFinishedIndex].status = "finished";
			this.setState({ utterances });
			this.nextFinishedIndex += 1;
		});

		Tts.addEventListener("tts-cancel", event => console.log("cancel", event));
	}

	componentDidMount() {
		Linking.getInitialURL().then((url) => {
			if (url) {
				console.log('Initial url is: ' + url);
				return Fs.readFile(url, "base64");
			}
		  }).then(text => {
			  if (text) console.log(new TextDecoder("utf-16").decode(decodeRaw(decode64(text))));
		  }).catch(err => console.error('An error occurred', err));
	}

	onTestButtonPress() {
		const text = "「ＯＫ」「加速魔法阵，发动——『Acceleration（加速）』」";
		Tts.speak(text);
		const utterances = this.state.utterances;
		utterances[this.nextPlanedIndex] = { status: "waiting", text };
		this.nextPlanedIndex += 1;
		this.setState({ utterances });
	}

	onTest2ButtonPress() {
		Tts.speak("再见。");

		const utterances = this.state.utterances;
		utterances[this.nextPlanedIndex] = { status: "waiting", text: "再见。" };
		this.nextPlanedIndex += 1;
		this.setState({ utterances });
	}

	render() {
		const state = this.state;
		console.log(state.utterances, Object.values(state.utterances));

		return <Container>
			<Header>
				<Left>
					<Button transparent><Icon name="arrow-back" /></Button>
				</Left>
				<Body>
					<Title>Title</Title>
				</Body>
				<Right>
					<Button transparent><Icon name="menu" /></Button>
				</Right>
			</Header>
			<View>
				<Button onPress={this.onTestButtonPress.bind(this)}><Text>Hello</Text></Button>
				<Button onPress={this.onTest2ButtonPress.bind(this)}><Text>Goodbye</Text></Button>
				<FlatList 
					data={Object.values(state.utterances)} 
					renderItem={({ item }) => <Text>{item.status}: {item.text}</Text>}
				/>
			</View>
		</Container>;
	}
}