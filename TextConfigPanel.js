// @flow

import React, { Component } from "react";
import Native, { View, FlatList, Dimensions, ScrollView, TouchableOpacity, Platform } from "react-native";
import { Container, Content, Header, Left, Body, Right, Button, Icon, Title, Text, List, ListItem, Footer, FooterTab, Spinner, CheckBox, Item, Input } from "native-base";
import { RecyclerListView, DataProvider, LayoutProvider } from "recyclerlistview";

import Tts from "react-native-tts";
import Fs from "react-native-fs";
import MeasureText from 'react-native-measure-text';
import TextSize from 'react-native-text-size'

import He from "he";
import { TextDecoder } from "text-encoding";
import update from 'immutability-helper';

import { base64ToRaw, rawToArray } from "./bit";
import { startAsync } from "./prom";
import { toFullWidth, toHalfWidth } from "./fullWidth"
import a from "./acss";

import { settings } from "./Reader";

/*:: type Props = {|
	text: string,
	onClose: (string, number, number, number) => any
|} */

/*:: type State = {|
|} */

export default class TextConfigPanel extends Component /*:: <Props, State> */ {
	constructor(props/*: Props */) {
		super(props);

		this.state = settings;
	}

	renderCheckbox(key, text) {
		const value = this.state[key];
		return <ListItem noIndent>
			<CheckBox checked={value} onPress={() => this.setState({ [key]: !value })}/>
			<Body><Text>{text}</Text></Body>
		</ListItem>;
	}

	renderTextField(key, text) {
		const value = this.state[key];
		return <ListItem noIndent style={a("pl-12")}>
			<View style={a("fx-1")}>
				<Item regular><Input style={a("fz-16 h-30 p-0")} value={value} onChangeText={text => this.setState({ [key]: text })}/></Item>
			</View>
			<Text style={a("fx-1 ta-c")}>{text}</Text>
		</ListItem>;
	}

	renderTextEditConfigBlock(key) {
		const value = this.state[key];
		return value.map(({ regexp, replace }, i) => <ListItem noIndent key={i.toString()} style={a("pl-12")}>
			<View style={{ flex: 1 }}>
				<Item regular>
					<Input style={a("fz-16 h-30 p-0")} value={regexp} onChangeText={text => this.onTextEditBlockTextChange(key, i, "regexp", text)}/>
				</Item>
				<Item regular>
					<Input style={a("fz-16 h-30 p-0")} value={replace} onChangeText={text => this.onTextEditBlockTextChange(key, i, "replace", text)}/>
				</Item>
			</View>
			<View style={a("pl-5")}>
				<Button small style={a("as-c")} danger onPress={() => this.onTextEditBlockDeleteButtonPress(key, i)}><Icon name="trash" /></Button>
				<Button small style={a("as-c")} success onPress={() => this.onTextEditBlockCopyButtonPress(key, i)}><Icon name="copy" /></Button>
			</View>
			<View style={a("pl-5")}>
				<Button small style={a("as-c")} light onPress={() => this.onTextEditBlockUpButtonPress(key, i)}><Icon name="arrow-up" /></Button>
				<Button small style={a("as-c")} light onPress={() => this.onTextEditBlockDownButtonPress(key, i)}><Icon name="arrow-down" /></Button>
			</View>
		</ListItem>);
	}

	onTextEditBlockTextChange(key/*: string */, i/*: number */, key2/*: string */, text/*: string */) {
		this.setState(update(this.state, { [key]: { [i]: { [key2]: { $set: text } } } }));
	}

	onTextEditBlockDeleteButtonPress(key, i) {
		this.setState(update(this.state, { [key]: { $splice: [ [ i, 1 ] ] } }));
	}
	
	onTextEditBlockCopyButtonPress(key, i) {
		const { regexp, replace } = this.state[key][i];
		this.setState(update(this.state, { [key]: { $splice: [ [ i, 0, { regexp, replace } ] ] } }));
	}
	
	onTextEditBlockUpButtonPress(key, i) {
		if (0 < i && i <= this.state[key].length - 1) {
			const value = this.state[key][i];
			this.setState(update(this.state, { [key]: { $splice: [ [ i, 1 ], [ i - 1, 0, value ] ] } }));
		}
	}

	onTextEditBlockDownButtonPress(key, i) {
		if (0 <= i && i < this.state[key].length - 1) {
			const value = this.state[key][i];
			this.setState(update(this.state, { [key]: { $splice: [ [ i, 1 ], [ i + 1, 0, value ] ] } }));
		}
	}

	render() {
		const settings = this.state;

		return <Container>
			<Header>
				<Left><Button transparent onPress={this.props.onClose}>
					<Icon name="arrow-back" />
				</Button></Left>
				<Body><Title>Text Config</Title></Body>
				<Right />
			</Header>
			<View style={{ flex: 1 }}>
                <ScrollView style={{ flex: 1 }}>
					<ListItem itemDivider><Text>Preprocessing</Text></ListItem>
					{this.renderCheckbox("decodeHtml", "Decode HTML entities")}
					{this.renderCheckbox("toFullWidth", "Convert to full width characters")}
					{this.renderCheckbox("toHalfWidth", "Convert to half width characters")}
					<ListItem itemDivider><Text>Editing full text</Text></ListItem>
					{this.renderTextEditConfigBlock("preEdits")}
					<ListItem itemDivider><Text>Splitting lines</Text></ListItem>
					{this.renderTextField("splitRegexp", "Line split RegExp")}
					{this.renderCheckbox("removeEmptyLines", "Remove empty lines")}
                </ScrollView>
			</View>
		</Container>
	}
}