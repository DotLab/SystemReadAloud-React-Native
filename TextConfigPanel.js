// @flow

import React, { Component } from "react";
import Native, { View, FlatList, Dimensions, ScrollView, TouchableOpacity, Platform } from "react-native";
import { Container, Content, Header, Left, Body, Right, Button, Icon, Title, Text, List, ListItem, Footer, FooterTab, Spinner, CheckBox, Item, Input } from "native-base";
import { RecyclerListView, DataProvider, LayoutProvider } from "recyclerlistview";
import { SlidersColorPicker } from "react-native-color";
import DropDownPicker from 'react-native-dropdown-picker';
import { fonts } from './fonts'
import { Collapse, CollapseHeader, CollapseBody } from "accordion-collapse-react-native";

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

function isRegexpValid(regexp/*: string */) {
	var isValid = true;
	try {
		new RegExp(regexp);
	} catch (e) {
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

		this.state = { doShowColorPicker: false, colorPickerProps: {}, colorPickerSwatches: [] };
	}

	componentWillUnmount() {
		this.props.discardTempChange();
	}

	updateSettingsAndSetState(spec) {
		let settings = this.props.settings;
		settings = update(settings, spec);
		this.props.onChange(settings);
	}

	renderCheckbox(key/*: string */, text/*: string */) {
		const value = this.props.settings[key];
		return <ListItem noIndent>
			<CheckBox checked={value} onPress={() => this.updateSettingsAndSetState({ [key]: { $set: !value } })} />
			<Body><Text>{text}</Text></Body>
		</ListItem>;
	}

	renderRegexTextField(key/*: string */, text/*: string */) {
		const value = this.props.settings[key];
		const isValid = isRegexpValid(text);
		return <ListItem noIndent style={a("pl-12")}>
			<View style={a("fx-1")}>
				<Item regular success={isValid} error={!isValid}>
					<Input style={a("fz-16 h-30 p-0")} value={value} onChangeText={text => this.updateSettingsAndSetState({ [key]: { $set: text } })} />
					{/* {!!isValid && <Icon name='checkmark-circle' />}
					{!isValid && <Icon name='close-circle' />} */}
				</Item>
			</View>
			<Text style={a("fx-1 ta-c")}>{text}</Text>
		</ListItem>;
	}

	renderColorTextField(key/*: string */, text/*: string */, key2) {
		const value = key2 ? this.props.settings[key2][key] : this.props.settings[key];
		return <ListItem noIndent style={a("pl-12")} onPress={() => {
			this.setState({
				doShowColorPicker: true,
				colorPickerProps: {
					color: value,
					onOk: hex => {
						this.state.doShowColorPicker = false;
						this.state.colorPickerSwatches.push(hex);
						key2 ? this.updateSettingsAndSetState({ [key2]: { [key]: { $set: hex } } })
							: this.updateSettingsAndSetState({ [key]: { $set: hex } });
					},
				}
			});
		}}>
			<Text style={a("fx-1 px-10 fw-600")}>{text}</Text>
			<Text style={{ marginHorizontal: 10, width: 10, backgroundColor: value }} />
			<View style={a("fx-1")}>
				<Item regular>
					<Input style={a("fz-16 h-30 p-0")} value={value}
						onChangeText={text => key2 ? this.updateSettingsAndSetState({ [key2]: { [key]: { $set: text } } })
							: this.updateSettingsAndSetState({ [key]: { $set: text } })} />
				</Item>
			</View>
		</ListItem>;
	}

	renderNumberTextField(key/*: string */, text/*: string */, key2) {
		const value = key2 ? this.props.settings[key2][key] : this.props.settings[key];
		return <ListItem noIndent style={a("pl-12")}>
			<Text style={a("fx-1 px-10 fw-600")}>{text}</Text>
			<View style={a("fx-1")}>
				<Item regular>
					<Input style={a("fz-16 h-30 p-0")} value={value.toString()}
						onChangeText={text => {
							text = !text || text.length === 0 ? 0 : text;
							key2 ? this.updateSettingsAndSetState({ [key2]: { [key]: { $set: parseFloat(text) } } })
								: this.updateSettingsAndSetState({ [key]: { $set: parseFloat(text) } })
						}}
						keyboardType="numeric" />
				</Item>
			</View>
		</ListItem>;
	}

	renderFontWeightSelectField(key/*: string */, text/*: string */, key2) {
		const value = this.props.settings[key2][key];
		return <View style={Platform.OS !== 'android' && { zIndex: 9 }}>
			<Text style={a("fx-1 mx-10 my-15 pl-12 fw-600")}>Font weight</Text>
			<DropDownPicker
				items={[
					{ label: 'Normal', value: 'normal' },
					{ label: 'Bold', value: 'bold' },
					{ label: '100', value: '100' },
					{ label: '200', value: '200' },
					{ label: '300', value: '300' },
					{ label: '400', value: '400' },
					{ label: '500', value: '500' },
					{ label: '600', value: '600' },
					{ label: '700', value: '700' },
					{ label: '800', value: '800' },
					{ label: '900', value: '900' },

				]}
				defaultValue={value || 'normal'}
				containerStyle={{ height: 30, paddingHorizontal: 12 }}
				selectedLabelStyle={{ color: 'black' }}
				style={{
					backgroundColor: '#ffffff', borderTopLeftRadius: 0, borderTopRightRadius: 0,
					borderBottomLeftRadius: 0, borderBottomRightRadius: 0
				}}
				dropDownStyle={{ backgroundColor: 'white', marginHorizontal: 12 }}
				onChangeItem={item => { this.updateSettingsAndSetState({ [key2]: { [key]: { $set: item.value } } }) }}
			/>
		</View >;
	}

	renderFontFamilyField(key/*: string */, text/*: string */, key2) {
		const value = this.props.settings[key2][key];
		return <View style={Platform.OS !== 'android' && { zIndex: 10 }}>
			<Text style={a("mx-10 my-15 pl-12 fw-600")}>Font family</Text>
			<DropDownPicker
				items={Platform.OS === 'android' ?
					fonts.Android.map(x => { return { label: x, value: x } }) :
					fonts.iOS.map(x => { return { label: x, value: x } })}
				defaultValue={value || 'PingFang SC'}
				containerStyle={{ height: 30, paddingHorizontal: 12 }}
				selectedLabelStyle={{ color: 'black' }}
				style={{
					backgroundColor: '#ffffff', borderTopLeftRadius: 0, borderTopRightRadius: 0,
					borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
				}}
				dropDownStyle={{ backgroundColor: 'white', marginHorizontal: 12 }}
				onChangeItem={item => { this.updateSettingsAndSetState({ [key2]: { [key]: { $set: item.value } } }) }}
			/>
		</View >;
	}

	renderTextEditConfigBlock(key/*: string */) {
		const value = this.props.settings[key];
		return value.map(({ regexp, replace }, i) => {
			const isValid = isRegexpValid(regexp);
			return <ListItem noIndent key={i.toString()} style={a("pl-12")}>
				<View style={{ flex: 1 }}>
					<Item regular success={isValid} error={!isValid}>
						<Input style={a("fz-16 h-30 p-0")} value={regexp} onChangeText={text => this.onTextEditBlockTextChange(key, i, "regexp", text)} />
						{/* {!!isValid && <Icon name='checkmark-circle' />}
						{!isValid && <Icon name='close-circle' />} */}
					</Item>
					<Item regular>
						<Input style={a("fz-16 h-30 p-0")} value={replace} onChangeText={text => this.onTextEditBlockTextChange(key, i, "replace", text)} />
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
		this.updateSettingsAndSetState({ [key]: { $splice: [[i, 1]] } });
	}

	onTextEditBlockCopyButtonPress(key/*: string */, i/*: number */) {
		const { regexp, replace } = this.state[key][i];
		this.updateSettingsAndSetState({ [key]: { $splice: [[i, 0, { regexp, replace }]] } });
	}

	onTextEditBlockUpButtonPress(key/*: string */, i/*: number */) {
		if (0 < i && i <= this.state[key].length - 1) {
			const value = this.state[key][i];
			this.updateSettingsAndSetState({ [key]: { $splice: [[i, 1], [i - 1, 0, value]] } });
		}
	}

	onTextEditBlockDownButtonPress(key/*: string */, i/*: number */) {
		if (0 <= i && i < this.state[key].length - 1) {
			const value = this.state[key][i];
			this.updateSettingsAndSetState({ [key]: { $splice: [[i, 1], [i + 1, 0, value]] } });
		}
	}

	render() {
		return <Container>
			<Header>
				<Left><Button transparent onPress={this.props.onClose}>
					<Icon name="close" />
				</Button></Left>
				<Body><Title>Text Config</Title></Body>
				<Right><Button transparent onPress={() => this.props.onApply()}>
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
					<ListItem itemDivider><Text>Editing a line</Text></ListItem>
					{this.renderTextEditConfigBlock("edits")}
					<View style={{ marginVertical: 20, backgroundColor: this.props.settings.pageColor }}>

						{this.props.prevLine3 && <View style={{
							backgroundColor: this.props.settings.lineReadColor,
							paddingHorizontal: this.props.settings.linePaddingX ? this.props.settings.linePaddingX : 0,
							paddingVertical: this.props.settings.linePaddingY ? this.props.settings.linePaddingY : 0,
						}}>
							<Text style={this.props.settings.textStyle}>[Read line] {this.props.prevLine3}</Text>
						</View>}

						{this.props.prevLine2 && <View style={{
							backgroundColor: this.props.settings.lineReadingColor,
							paddingHorizontal: this.props.settings.linePaddingX ? this.props.settings.linePaddingX : 0,
							paddingVertical: this.props.settings.linePaddingY ? this.props.settings.linePaddingY : 0,
						}}>
							<Text style={this.props.settings.textStyle}>[Line being read] {this.props.prevLine2}</Text>
						</View>}

						{this.props.prevLine1 && <View style={{
							backgroundColor: this.props.settings.lineScheduledColor,
							paddingHorizontal: this.props.settings.linePaddingX ? this.props.settings.linePaddingX : 0,
							paddingVertical: this.props.settings.linePaddingY ? this.props.settings.linePaddingY : 0,
						}}>
							<Text style={this.props.settings.textStyle}>[Line to be read (when audio paused)] {this.props.prevLine1}</Text>
						</View>}

						{this.props.prevLine0 && <View style={{
							backgroundColor: this.props.settings.lineColor,
							paddingHorizontal: this.props.settings.linePaddingX ? this.props.settings.linePaddingX : 0,
							paddingVertical: this.props.settings.linePaddingY ? this.props.settings.linePaddingY : 0,
						}}>
							<Text style={this.props.settings.textStyle}>[Unread line] {this.props.prevLine0}</Text>
						</View>}


						<View style={{
							backgroundColor: this.props.settings.lineSelectedColor,
							paddingHorizontal: this.props.settings.linePaddingX ? this.props.settings.linePaddingX : 0,
							paddingVertical: this.props.settings.linePaddingY ? this.props.settings.linePaddingY : 0,
						}}>
							<Text style={this.props.settings.textStyle}>[Selected line] {this.props.currentLine}</Text>
						</View>


					</View>

					<Collapse>
						<CollapseHeader>
							<Text style={{ padding: 15 }}>Rendering lines</Text>
						</CollapseHeader>
						<CollapseBody>
							{this.renderNumberTextField("linePaddingX", "Horizontal Padding")}
							{this.renderNumberTextField("linePaddingY", "Vertical Padding")}
							{this.renderColorTextField("pageColor", "Page Color")}
							{this.renderColorTextField("lineColor", "Line Color")}
							{this.renderColorTextField("lineSelectedColor", "Line Selected Color")}
							{this.renderColorTextField("lineScheduledColor", "Line Scheduled Color")}
							{this.renderColorTextField("lineReadingColor", "Line Reading Color")}
							{this.renderColorTextField("lineReadColor", "Line Read Color")}
						</CollapseBody>
					</Collapse>
					<Collapse>
						<CollapseHeader>
							<Text style={{ padding: 15 }}>Rendering text</Text>
						</CollapseHeader>
						<CollapseBody>
							{this.renderFontFamilyField("fontFamily", "Font family", "textStyle")}
							{this.renderFontWeightSelectField("fontWeight", "Font weight", "textStyle")}
							{this.renderNumberTextField("fontSize", "Font size", "textStyle")}
							{this.renderColorTextField("color", "Font color", "textStyle")}
						</CollapseBody>
					</Collapse>

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
		</Container >
	}
}