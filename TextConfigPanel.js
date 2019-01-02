// @flow

import React, { Component } from "react";
import Native, { View, FlatList, Dimensions, ScrollView, TouchableOpacity, Platform } from "react-native";
import { Container, Content, Header, Left, Body, Right, Button, Icon, Title, Text, List, ListItem, Footer, FooterTab, Spinner, CheckBox, Item, Input } from "native-base";
import { RecyclerListView, DataProvider, LayoutProvider } from "recyclerlistview";
import { SlidersColorPicker } from "react-native-color";

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

function isRegexpValid(regexp/*: string */) {
	var isValid = true;
	try {
		new RegExp(regexp);
	} catch(e) {
		isValid = false;
	}
	return isValid;
}

function isNumberValid(num/*: number */) {
	return !isNaN(parseFloat(num));
}

/*:: type Props = {|
	text: string,
	onClose: (string, number, number, number) => any
|} */

/*:: type State = Object */

export default class TextConfigPanel extends Component /*:: <Props, State> */ {
	constructor(props/*: Props */) {
		super(props);

		this.state = { settings, doShowColorPicker: false, colorPickerProps: {}, colorPickerSwatches: [] };
	}

	updateSettingsAndSetState(spec) {
		this.setState({ settings: update(this.state.settings, spec) });
	}

	renderCheckbox(key/*: string */, text/*: string */) {
		const value = this.state.settings[key];
		return <ListItem noIndent>
			<CheckBox checked={value} onPress={() => this.updateSettingsAndSetState({ [key]: { $set: !value } })}/>
			<Body><Text>{text}</Text></Body>
		</ListItem>;
	}

	renderRegexTextField(key/*: string */, text/*: string */) {
		const value = this.state.settings[key];
		const isValid = isRegexpValid(text);
		return <ListItem noIndent style={a("pl-12")}>
			<View style={a("fx-1")}>
				<Item regular success={isValid} error={!isValid}>
					<Input style={a("fz-16 h-30 p-0")} value={value} onChangeText={text => this.updateSettingsAndSetState({ [key]: { $set: text } })}/>
					{/* {!!isValid && <Icon name='checkmark-circle' />}
					{!isValid && <Icon name='close-circle' />} */}
				</Item>
			</View>
			<Text style={a("fx-1 ta-c")}>{text}</Text>
		</ListItem>;
	}

	renderColorTextField(key/*: string */, text/*: string */) {
		const value = this.state.settings[key];
		return <ListItem noIndent style={a("pl-12")} onPress={() => {
			this.setState({
				doShowColorPicker: true,
				colorPickerProps: {
					color: value,
					onOk: hex => {
						this.state.doShowColorPicker = false;
						this.state.colorPickerSwatches.push(hex);
						this.updateSettingsAndSetState({ [key]: { $set: hex } });
					},
				}
			});
		}}>
			<View style={a("fx-1")}>
				<Item regular>
					<Input style={a("fz-16 h-30 p-0")} value={value} onChangeText={text => this.updateSettingsAndSetState({ [key]: { $set: text } })}/>
				</Item>
			</View>
			<Text style={a("fx-1 ta-c")}>{text}</Text>
			<Text style={{ width: 10, backgroundColor: value }}/>
		</ListItem>;
	}

	renderNumberTextField(key/*: string */, text/*: string */) {
		const value = this.state.settings[key];
		return <ListItem noIndent style={a("pl-12")}>
			<View style={a("fx-1")}>
				<Item regular>
					<Input style={a("fz-16 h-30 p-0")} value={value.toString()} onChangeText={text => this.updateSettingsAndSetState({ [key]: { $set: parseFloat(text) } })} keyboardType="numeric"/>
				</Item>
			</View>
			<Text style={a("fx-1 ta-c")}>{text}</Text>
		</ListItem>;
	}

	renderTextEditConfigBlock(key/*: string */) {
		const value = this.state.settings[key];
		return value.map(({ regexp, replace }, i) => {
			const isValid = isRegexpValid(regexp);
			return <ListItem noIndent key={i.toString()} style={a("pl-12")}>
				<View style={{ flex: 1 }}>
					<Item regular success={isValid} error={!isValid}>
						<Input style={a("fz-16 h-30 p-0")} value={regexp} onChangeText={text => this.onTextEditBlockTextChange(key, i, "regexp", text)}/>
						{/* {!!isValid && <Icon name='checkmark-circle' />}
						{!isValid && <Icon name='close-circle' />} */}
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
			</ListItem>;
		});
	}

	onTextEditBlockTextChange(key/*: string */, i/*: number */, key2/*: string */, text/*: string */) {
		this.updateSettingsAndSetState({ [key]: { [i]: { [key2]: { $set: text } } } });
	}

	onTextEditBlockDeleteButtonPress(key/*: string */, i/*: number */) {
		this.updateSettingsAndSetState({ [key]: { $splice: [ [ i, 1 ] ] } });
	}
	
	onTextEditBlockCopyButtonPress(key/*: string */, i/*: number */) {
		const { regexp, replace } = this.state[key][i];
		this.updateSettingsAndSetState({ [key]: { $splice: [ [ i, 0, { regexp, replace } ] ] } });
	}
	
	onTextEditBlockUpButtonPress(key/*: string */, i/*: number */) {
		if (0 < i && i <= this.state[key].length - 1) {
			const value = this.state[key][i];
			this.updateSettingsAndSetState({ [key]: { $splice: [ [ i, 1 ], [ i - 1, 0, value ] ] } });
		}
	}

	onTextEditBlockDownButtonPress(key/*: string */, i/*: number */) {
		if (0 <= i && i < this.state[key].length - 1) {
			const value = this.state[key][i];
			this.updateSettingsAndSetState({ [key]: { $splice: [ [ i, 1 ], [ i + 1, 0, value ] ] } });
		}
	}

	render() {
		return <Container>
			<Header>
				<Left><Button transparent onPress={this.props.onClose}>
					<Icon name="close" />
				</Button></Left>
				<Body><Title>Text Config</Title></Body>
				<Right><Button transparent onPress={() => this.props.onApply(this.state.settings)}>
					<Icon name="checkmark" />
				</Button></Right>
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
					{this.renderRegexTextField("splitRegexp", "Line split RegExp")}
					{this.renderCheckbox("removeEmptyLines", "Remove empty lines")}
					<ListItem itemDivider><Text>Editing a line</Text></ListItem>
					{this.renderTextEditConfigBlock("edits")}
					<ListItem itemDivider><Text>Rendering lines</Text></ListItem>
					{this.renderNumberTextField("linePaddingX", "Horizontal Padding")}
					{this.renderNumberTextField("linePaddingY", "Vertical Padding")}
					{this.renderColorTextField("pageColor", "Page Color")}
					{this.renderColorTextField("lineColor", "Line Color")}
					{this.renderColorTextField("lineSelectedColor", "Line Selected Color")}
					{this.renderColorTextField("lineScheduledColor", "Line Scheduled Color")}
					{this.renderColorTextField("lineReadingColor", "Line Reading Color")}
					{this.renderColorTextField("lineReadColor", "Line Read Color")}
					<ListItem itemDivider><Text>Rendering text</Text></ListItem>
					<ListItem noIndent>
						<View style={{ flex: 1 }}>
						</View>
					</ListItem>
					<ListItem itemDivider><Text>Painting text</Text></ListItem>
					{this.state.doShowColorPicker && <SlidersColorPicker 
						{...this.state.colorPickerProps}
						visible={true}
						returnMode={'hex'}
						okLabel="Done"
						cancelLabel="Cancel"
						onCancel={() => this.setState({ doShowColorPicker: false })}
						swatches={this.state.colorPickerSwatches}
						swatchesLabel="RECENT COLORS"
					/>}
                </ScrollView>
			</View>
		</Container>
	}
}