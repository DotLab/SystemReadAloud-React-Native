// @flow

import React, { Component } from "react";
import { View, ScrollView, TouchableOpacity, Platform } from "react-native";
import { Container, Header, Left, Body, Right, Button, Icon, Title, Text, ListItem, Item, Input } from "native-base";
import { SlidersColorPicker } from "react-native-color";
import DropDownPicker from 'react-native-dropdown-picker';
import Slider from '@react-native-community/slider';

import Tts from "react-native-tts";

import update from 'immutability-helper';
import a from "./acss";

export default class VoicePaintConfig extends Component /*:: <Props, State> */ {
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
        this.props.onSettingChange(settings);
    }

    renderNumberSliderField(key/*: string */, text/*: string */, key2, i, min, max, step) {
        // const value = key2 ? this.props.settings[key2][key] : this.props.settings[key];
        const value = this.props.settings[key2][i]["style"][key] || this.props.settings["voiceStyle"][key];
        return <ListItem noIndent style={a("pl-12")}>
            <Text style={a("fx-1 px-10 fw-600")}>{text}</Text>
            <View style={a("fx-1")}>
                <Text>{value.toFixed(1)}</Text>
                <Slider
                    value={value}
                    minimumValue={min}
                    maximumValue={max}
                    step={step}
                    onSlidingComplete={(value) =>
                        this.updateSettingsAndSetState({ [key2]: { [i]: { style: { [key]: { $set: parseFloat(value) } } } } })
                    }
                />

            </View>
        </ListItem>;
    }

    renderVoiceIdField(key/*: string */, text/*: string */, key2, i) {
        // const value = this.props.settings[key2][key];
        const value = this.props.settings[key2][i]["style"][key] || this.props.settings["voiceStyle"][key];
        const voices = this.props.voices || [];

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
                onChangeItem={item => {
                    this.updateSettingsAndSetState({ [key2]: { [i]: { style: { [key]: { $set: item.value } } } } });
                }}
            />
        </View >;
    }

    onPlaySampleAudio(text, pitch, rate, voiceId) {
        console.log('here!!', pitch, rate, voiceId);
        if (pitch) Tts.setDefaultPitch(pitch);
        if (rate) Tts.setDefaultRate(rate);
        if (voiceId) Tts.setDefaultVoice(voiceId);

        console.log('current pitch, rate, voice', pitch, rate, voiceId);
        Tts.speak(text);
    }

    renderFontWeightSelectField(key/*: string */, text/*: string */, key2, i) {
        const value = this.props.settings[key2][i]["style"][key] || this.props.settings["textStyle"][key];
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
                onChangeItem={item => {
                    this.updateSettingsAndSetState({ [key2]: { [i]: { style: { [key]: { $set: item.value } } } } });
                }}
            />
        </View >;
    }

    render() {
        if (!this.props.settings) return;
        return <Container>
            <Header>
                <Left><Button transparent onPress={this.props.onClose}>
                    <Icon name="close" />
                </Button></Left>
                <Body><Title>Text Paint Config</Title></Body>
                <Right><Button transparent onPress={() => this.props.onSettingConfirm()}>
                    <Icon name="checkmark" />
                </Button></Right>
            </Header>
            <View style={{ flex: 1 }}>
                <ScrollView style={{ flex: 1 }}>

                    <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 10 }}>
                        <TouchableOpacity style={{ marginRight: 10, paddingVertical: 3 }}
                            onPress={() => this.onPlaySampleAudio("This is a sample text",
                                this.props.settings.voicePaints[this.props.i].style.pitch,
                                this.props.settings.voicePaints[this.props.i].style.rate,
                                this.props.settings.voicePaints[this.props.i].style.voiceId,
                            )}>
                            <Icon style={{ fontSize: 15 }} type="FontAwesome" name="play" />
                        </TouchableOpacity>
                        <Text>This is a sample text</Text>
                    </View>

                    <Text style={{ padding: 15 }}>Voice Paint for  {this.props.regExp}</Text>
                    {this.renderVoiceIdField("voiceId", "Voice name", "voicePaints", this.props.i)}
                    {this.renderNumberSliderField("pitch", "Pitch", "voicePaints", this.props.i, 0.5, 2, 0.1)}
                    {this.renderNumberSliderField("rate", "Rate", "voicePaints", this.props.i, 0.01, 1, 0.1)}
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