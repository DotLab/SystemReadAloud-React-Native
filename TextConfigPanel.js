// @flow

import React, { Component } from "react";
import { View, ScrollView, Platform, TouchableOpacity } from "react-native";
import { Container, Header, Left, Body, Right, Button, Icon, Title, Text, ListItem, CheckBox, Item, Input } from "native-base";
import { SlidersColorPicker } from "react-native-color";
import DropDownPicker from 'react-native-dropdown-picker'
import Slider from '@react-native-community/slider';

import Tts from "react-native-tts";
import { fonts } from './fonts'
import { Collapse, CollapseHeader, CollapseBody } from "accordion-collapse-react-native";
import { paint } from './Reader'

import update from 'immutability-helper';
import a from "./acss";

const TEXT_PAINT_CONFIG = "TEXT_PAINT_CONFIG";
const VOICE_PAINT_CONFIG = "VOICE_PAINT_CONFIG";

import TextPaintConfig from './TextPaintConfig'
import VoicePaintConfig from './VoicePaintConfig'

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

export default class TextConfigPanel extends Component /*:: <Props, State> */ {
	constructor(props/*: Props */) {
		super(props);

		this.state = { doShowColorPicker: false, colorPickerProps: {}, colorPickerSwatches: [] };

		this.onTextPaintButtonPress = this.onTextPaintButtonPress.bind(this);
		this.onPlaySampleAudio = this.onPlaySampleAudio.bind(this)
		this.currentSpeechId = 0;
	}

	async componentDidMount() {
		try {
			await Tts.getInitStatus();
			const voices = await Tts.voices();
			this.setState({ voices })
		} catch (err) {
			if (err.code === 'no_engine') {
				Tts.requestInstallEngine();
			}
			throw err;
		}
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

	renderTextPaintConfigBlock(key/*: string */) {
		const value = this.props.settings[key];
		return value.map(({ regexp }, i) => {
			const isValid = isRegexpValid(regexp);
			return <ListItem noIndent key={i.toString()} style={a("pl-12")}>
				<View style={{ flex: 1 }}>
					<Item regular success={isValid} error={!isValid}>
						<Input style={a("fz-16 h-30 p-0")} value={regexp} onChangeText={text => this.onTextEditBlockTextChange(key, i, "regexp", text)} />
					</Item>
					<TouchableOpacity onPress={() => this.onTextPaintButtonPress(i, regexp)}>
						<View style={{ backgroundColor: this.props.settings.pageColor }}>
							<View style={{
								backgroundColor: this.props.settings.lineColor,
								paddingHorizontal: this.props.settings.linePaddingX ? this.props.settings.linePaddingX : 0,
								paddingVertical: this.props.settings.linePaddingY ? this.props.settings.linePaddingY : 0,
							}}>
								<Text style={this.props.settings.textPaints[parseFloat(i)].style}>Sample text</Text>
							</View>
						</View>
						{/* <Icon style={{ paddingVertical: 5, paddingHorizontal: 10, fontSize: 18 }} type="Feather" name="edit-2" /> */}
					</TouchableOpacity>
				</View>
				<View style={a("pl-5")}>
					<Button small style={a("as-c")} danger onPress={() => this.onTextEditBlockDeleteButtonPress(key, i)}><Icon name="trash" /></Button>
					<Button small style={a("as-c")} success onPress={() => this.onTextPaintBlockCopyButtonPress(key, i)}><Icon name="copy" /></Button>
				</View>
				<View style={a("pl-5")}>
					<Button small style={a("as-c")} light onPress={() => this.onTextEditBlockUpButtonPress(key, i)}><Icon name="arrow-up" /></Button>
					<Button small style={a("as-c")} light onPress={() => this.onTextEditBlockDownButtonPress(key, i)}><Icon name="arrow-down" /></Button>
				</View>
			</ListItem>;
		});
	}

	renderVoicePaintConfigBlock(key/*: string */) {
		const value = this.props.settings[key];
		return value.map(({ regexp }, i) => {
			const isValid = isRegexpValid(regexp);
			return <ListItem noIndent key={i.toString()} style={a("pl-12")}>
				<View style={{ flex: 1 }}>
					<Item regular success={isValid} error={!isValid}>
						<Input style={a("fz-16 h-30 p-0")} value={regexp} onChangeText={text => this.onTextEditBlockTextChange(key, i, "regexp", text)} />
					</Item>
					{/* <View style={{
						paddingHorizontal: 20,
						paddingVertical: 10,
					}}> */}
					<View style={{ flexDirection: 'row' }}>
						<TouchableOpacity
							style={{ marginHorizontal: 10, paddingVertical: 10 }}
							onPress={() => this.onPlaySampleAudio('This is a sample text.',
								this.props.settings.voicePaints[i].style.pitch,
								this.props.settings.voicePaints[i].style.rate,
								this.props.settings.voicePaints[i].style.voiceId,
							)}>
							<Icon style={{ fontSize: 15 }} type="FontAwesome" name="play" />
						</TouchableOpacity>
						<TouchableOpacity style={{ paddingVertical: 10 }} onPress={() => this.onVoicePaintButtonPress(i, regexp)}>
							<Text>This is a sample text.</Text>
						</TouchableOpacity>
					</View>

					{/* <Text style={{ color: this.props.settings.textStyle.color || 'white' }}>{prefix} {line.textSegments.map(({ text, style }, i) => <Text key={i.toString()} style={style}>{text}</Text>)}</Text> */}
					{/* </View>; */}
				</View>
				<View style={a("pl-5")}>
					<Button small style={a("as-c")} danger onPress={() => this.onTextEditBlockDeleteButtonPress(key, i)}><Icon name="trash" /></Button>
					<Button small style={a("as-c")} success onPress={() => this.onTextPaintBlockCopyButtonPress(key, i)}><Icon name="copy" /></Button>
				</View>
				<View style={a("pl-5")}>
					<Button small style={a("as-c")} light onPress={() => this.onTextEditBlockUpButtonPress(key, i)}><Icon name="arrow-up" /></Button>
					<Button small style={a("as-c")} light onPress={() => this.onTextEditBlockDownButtonPress(key, i)}><Icon name="arrow-down" /></Button>
				</View>
			</ListItem>;
		});
	}

	renderPreviewLine(line, backgroundColor, prefix) {
		// paint as needed
		if (!line.textSegments) line.textSegments = paint(line.text, this.props.settings.textStyle, this.props.settings.textPaints)

		return <View style={{
			backgroundColor,
			paddingHorizontal: this.props.settings.linePaddingX ? this.props.settings.linePaddingX : 0,
			paddingVertical: this.props.settings.linePaddingY ? this.props.settings.linePaddingY : 0,
		}}>
			<Text style={{ color: this.props.settings.textStyle.color || 'white' }}>{prefix} {line.textSegments.map(({ text, style }, i) => <Text key={i.toString()} style={style}>{text}</Text>)}</Text>
		</View>;
	}

	renderVoicePreviewLine(line) {
		// paint as needed
		// if (!line.textSegments) line.textSegments = paint(line.text, this.props.settings.textStyle, this.props.settings.textPaints)

		console.log(line)
		return <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 10 }}>
			<TouchableOpacity style={{ marginRight: 10, marginVertical: 10 }}
				onPress={() => this.onPlaySampleAudio(line.text,
					this.props.settings.voiceStyle.pitch,
					this.props.settings.voiceStyle.rate,
					this.props.settings.voiceStyle.voiceId,
				)}>
				<Icon style={{ fontSize: 15 }} type="FontAwesome" name="play" />
			</TouchableOpacity>
			<Text>{line.text}</Text>
			{/* <Text style={{ color: this.props.settings.textStyle.color || 'white' }}>{prefix} {line.textSegments.map(({ text, style }, i) => <Text key={i.toString()} style={style}>{text}</Text>)}</Text> */}
		</View>;
	}

	renderNumberSliderField(key/*: string */, text/*: string */, key2, min, max, step) {
		const value = key2 ? this.props.settings[key2][key] : this.props.settings[key];
		return <ListItem noIndent style={a("pl-12")}>
			<Text style={a("fx-1 px-10 fw-600")}>{text}</Text>
			<View style={a("fx-1")}>
				<Text>{value.toFixed(1)}</Text>
				<Slider
					value={value}
					minimumValue={min}
					maximumValue={max}
					step={step}
					onSlidingComplete={(value) => this.updateSettingsAndSetState({ [key2]: { [key]: { $set: parseFloat(value) } } })}
				/>

			</View>
		</ListItem>;
	}

	renderVoiceIdField(key/*: string */, text/*: string */, key2) {
		const value = this.props.settings[key2][key];
		const voices = this.state.voices || [];

		// console.log(voices.map(x => { return { label: `${x.language}  ${x.name}`, value: x.id } }))
		return <View style={Platform.OS !== 'android' && { zIndex: 10 }}>
			<Text style={a("mx-10 my-15 pl-12 fw-600")}>{text}</Text>
			<DropDownPicker
				// items={Platform.OS === 'android' ?
				// fonts.Android.map(x => { return { label: x, value: x } }) :
				items={
					voices.map(x => { return { label: `${x.language}  ${x.name}`, value: x.id } })}
				defaultValue={value || 'com.apple.ttsbundle.Samantha-compact'}

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

	onTextEditBlockTextChange(key/*: string */, i/*: number */, key2/*: string */, text/*: string */) {
		this.updateSettingsAndSetState({ [key]: { [i]: { [key2]: { $set: text } } } });
	}

	onTextEditBlockDeleteButtonPress(key/*: string */, i/*: number */) {
		this.updateSettingsAndSetState({ [key]: { $splice: [[i, 1]] } });
	}

	onTextEditBlockCopyButtonPress(key/*: string */, i/*: number */) {
		const { regexp, replace } = this.props.settings[key][i];
		this.updateSettingsAndSetState({ [key]: { $splice: [[i, 0, { regexp, replace }]] } });
	}

	onTextPaintBlockCopyButtonPress(key/*: string */, i/*: number */) {
		const { regexp, style } = this.props.settings[key][i];
		this.updateSettingsAndSetState({ [key]: { $splice: [[i, 0, { regexp, style }]] } });
	}

	onTextEditBlockUpButtonPress(key/*: string */, i/*: number */) {
		if (0 < i && i <= this.props.settings[key].length - 1) {
			const value = this.props.settings[key][i];
			this.updateSettingsAndSetState({ [key]: { $splice: [[i, 1], [i - 1, 0, value]] } });
		}
	}

	onTextEditBlockDownButtonPress(key/*: string */, i/*: number */) {
		if (0 <= i && i < this.props.settings[key].length - 1) {
			const value = this.props.settings[key][i];
			this.updateSettingsAndSetState({ [key]: { $splice: [[i, 1], [i + 1, 0, value]] } });
		}
	}

	onTextPaintButtonPress(i, regExp) {
		this.setState({
			page: TEXT_PAINT_CONFIG,
			pageProps: {
				i, regExp,
				onClose: () => {
					this.setState({ page: undefined });
				}
			}
		});
	}

	onVoicePaintButtonPress(i, regExp) {
		this.setState({
			page: VOICE_PAINT_CONFIG,
			pageProps: {
				i, regExp,
				onClose: () => {
					this.setState({ page: undefined });
				}
			}
		});
	}

	onPlaySampleAudio(text, pitch, rate, voiceId) {
		console.log('here!!', pitch, rate, voiceId);
		if (pitch) Tts.setDefaultPitch(pitch);
		if (rate) Tts.setDefaultRate(rate);
		if (voiceId) Tts.setDefaultVoice(voiceId);

		console.log('current pitch, rate, voice', pitch, rate, voiceId);
		Tts.speak(text);
		// this.currentSpeechId = 0;
		// const voiceSegments = buildVoiceSegments(this.props.currentLine, this.props.settings.voiceStyle, this.props.settings.voicePaints, this.props.settings.voiceEdits);
		// if (voiceSegments) {
		// 	const segment = this.lines[this.selectedIndex].voiceSegments[this.currentSpeechId];

		// 	console.log(voiceSegments, segment);
		// 	setTtsVoiceStyle(segment.style);
		// 	if (Platform.OS === "android") {
		// 		Tts.speak("　　“    " + segment.text + "                     ", voiceStyleToParam(segment.style));
		// 	} else {
		// 		Tts.speak(segment.text, voiceStyleToParam(segment.style));
		// 	}
		// }
	}

	onSettingChange(tempSettings) {
		this.props.onChange(tempSettings);
	}

	async onSettingConfirm() {
		await this.props.onApply();
	}

	discardTempChange() {
		this.props.discardTempChange();
	}

	render() {
		switch (this.state.page) {
			case TEXT_PAINT_CONFIG:
				return <TextPaintConfig {...this.state.pageProps}
					onSettingChange={this.onSettingChange.bind(this)}
					onSettingConfirm={this.onSettingConfirm.bind(this)}
					discardTempChange={this.discardTempChange.bind(this)}
					settings={this.props.settings}
				/>
			case VOICE_PAINT_CONFIG:
				return <VoicePaintConfig {...this.state.pageProps}
					onSettingChange={this.onSettingChange.bind(this)}
					onSettingConfirm={this.onSettingConfirm.bind(this)}
					discardTempChange={this.discardTempChange.bind(this)}
					settings={this.props.settings}
					voices={this.state.voices}
				/>
		}

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
					<Collapse>
						<CollapseHeader>
							<Text style={{ padding: 15, fontSize: 17 }}>Preprocessing</Text>
						</CollapseHeader>
						<CollapseBody>
							{this.renderCheckbox("decodeHtml", "Decode HTML entities")}
							{this.renderCheckbox("toFullWidth", "Convert to full width characters")}
							{this.renderCheckbox("toHalfWidth", "Convert to half width characters")}
						</CollapseBody>
					</Collapse>
					<Collapse>
						<CollapseHeader>
							<Text style={{ padding: 15, fontSize: 17 }}>Editing full text</Text>
						</CollapseHeader>
						<CollapseBody>
							{this.renderTextEditConfigBlock("preEdits")}
						</CollapseBody>
					</Collapse>
					<Collapse>
						<CollapseHeader>
							<Text style={{ padding: 15, fontSize: 17 }}>Splitting lines</Text>
						</CollapseHeader>
						<CollapseBody>
							{this.renderRegexTextField("splitRegexp", "Line split RegExp")}
						</CollapseBody>
					</Collapse>
					<Collapse>
						<CollapseHeader>
							<Text style={{ padding: 15, fontSize: 17 }}>Editing a line</Text>
						</CollapseHeader>
						<CollapseBody>
							{this.renderTextEditConfigBlock("edits")}
						</CollapseBody>
					</Collapse>
					<View style={{ marginVertical: 20, backgroundColor: this.props.settings.pageColor }}>
						{this.props.prevLine3 && this.renderPreviewLine(this.props.prevLine3, this.props.settings.lineReadColor, "[Line that has been read]")}
						{this.props.prevLine2 && this.renderPreviewLine(this.props.prevLine2, this.props.settings.lineReadingColor, "[Line being read]")}
						{this.props.prevLine1 && this.renderPreviewLine(this.props.prevLine1, this.props.settings.lineScheduledColor, "[Line to be read (audio paused)]")}
						{this.props.prevLine0 && this.renderPreviewLine(this.props.prevLine0, this.props.settings.lineColor, "[Unread line]")}
						{this.props.currentLine && this.renderPreviewLine(this.props.currentLine, this.props.settings.lineSelectedColor, "[Selected line]")}
					</View>

					<Collapse>
						<CollapseHeader>
							<Text style={{ padding: 15, fontSize: 17 }}>Line style</Text>
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
							<Text style={{ padding: 15, fontSize: 17 }}>Default text style</Text>
						</CollapseHeader>
						<CollapseBody>
							{this.renderFontFamilyField("fontFamily", "Font family", "textStyle")}
							{this.renderFontWeightSelectField("fontWeight", "Font weight", "textStyle")}
							{this.renderNumberTextField("fontSize", "Font size", "textStyle")}
							{this.renderColorTextField("color", "Font color", "textStyle")}
						</CollapseBody>
					</Collapse>

					<Collapse>
						<CollapseHeader>
							<Text style={{ padding: 15, fontSize: 17 }}>Regular expression text style</Text>
						</CollapseHeader>
						<CollapseBody>
							{this.renderTextPaintConfigBlock("textPaints")}
						</CollapseBody>
					</Collapse>
					<ListItem noIndent>
						<View style={{ flex: 1 }}>
						</View>
					</ListItem>
					<View style={{ marginVertical: 20 }}>
						{this.renderVoicePreviewLine(this.props.currentLine)}
					</View>
					<Collapse>
						<CollapseHeader>
							<Text style={{ padding: 15, fontSize: 17 }}>Voices</Text>
						</CollapseHeader>
						<CollapseBody>
							{this.renderVoiceIdField("voiceId", "Voice name", "voiceStyle")}
							{this.renderNumberSliderField("pitch", "Pitch", "voiceStyle", 0.5, 2, 0.1)}
							{this.renderNumberSliderField("rate", "Rate", "voiceStyle", 0.01, 1, 0.1)}
						</CollapseBody>
					</Collapse>

					<Collapse>
						<CollapseHeader>
							<Text style={{ padding: 15, fontSize: 17 }}>Regular expression voice style</Text>
						</CollapseHeader>
						<CollapseBody>
							{this.renderVoicePaintConfigBlock("voicePaints")}
						</CollapseBody>
					</Collapse>

					<ListItem noIndent>
						<View style={{ flex: 1, marginVertical: 20 }}>
						</View>
					</ListItem>
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