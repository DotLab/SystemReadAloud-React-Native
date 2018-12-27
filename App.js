import React, { Component } from "react";
import { View, FlatList, Linking } from "react-native";
import { Container, Content, Header, Left, Body, Right, Button, Icon, Title, Text, List, ListItem, Footer, FooterTab } from "native-base";

import Store from "react-native-simple-store";
import Tts from "react-native-tts";
import Fs from "react-native-fs";

import md5 from "js-md5";

import { decode64, decodeRaw } from "./base64";
import { parseZhNumber, fixNumberWidth } from "./zhNumber";

import Reader from "./Reader";

export default class App extends Component {
	constructor() {
		super();
		this.state = {};
		this.basePath = Fs.DocumentDirectoryPath + "/";
	}
	
	componentDidMount() {
		this.init();
	}

	async init() {
		const url = await Linking.getInitialURL();
		if (url) {
			const urlDecoded = decodeURIComponent(url);
			const fileName = urlDecoded.substring(urlDecoded.lastIndexOf("/") + 1);
			this.setState({ importedFileName: fileName });

			const text = await Fs.readFile(url, "base64");
			await Fs.writeFile(this.basePath + fileName, text, "base64");
		}

		await this.refreshBookList();
	}

	async refreshBookList() {
		this.setState({ dirItems: [] });

		const dirItems = await Fs.readDir(this.basePath);
		dirItems.forEach(val => {
			val.key = val.name;
			val.dateStr = val.mtime.toLocaleDateString();
			val.sizeStr = (val.size / 1024).toFixed(0).toString();
			val.sortName = val.name.replace(/([零一二三四五六七八九十]+)/, seg => fixNumberWidth(parseZhNumber(seg)));
		});
		dirItems.sort((a, b) => a.sortName < b.sortName ? -1 : 1);
		this.setState({ dirItems });
	}

	renderFileListItem({ item }) {
		return <ListItem
			button
			noIndent
			onPress={() => this.setState({ selectedDirItem: item })}
		>
			<Body>
				<Text>{item.name}</Text>
				<Text note>{item.dateStr} • {item.sizeStr} KB</Text>
			</Body>
		</ListItem>;
	}

	closeReader() {
		this.setState({ selectedDirItem: undefined });
	}

	render() {
		const state = this.state;
		
		if (state.selectedDirItem) {
			return <Reader 
				selectedDirItem={state.selectedDirItem} 
				closeReader={this.closeReader.bind(this)}
			/>;
		}

		return <Container>
			<Header>
				<Left>
					<Button transparent onPress={this.refreshBookList.bind(this)}>
						<Icon name="refresh" />
					</Button>
				</Left>
				<Body>
					<Title>Library</Title>
				</Body>
				<Right>
					<Button transparent><Icon name="menu" /></Button>
				</Right>
			</Header>
			
			<Content>
				<FlatList
					data={state.dirItems}
					renderItem={this.renderFileListItem.bind(this)}
				/>
			</Content>

			{state.importedFileName && <Footer>
				<FooterTab>
					<Button full><Text>{state.importedFileName}</Text></Button>
				</FooterTab>
			</Footer>}
		</Container>;
	}
}