// @flow

import React, { Component } from "react";
import { View, ScrollView, Platform } from "react-native";
import { Container, Header, Left, Body, Right, Button, Icon, Title, Text, ListItem, Item, Input } from "native-base";
import { SlidersColorPicker } from "react-native-color";
import DropDownPicker from 'react-native-dropdown-picker';

import update from 'immutability-helper';
import a from "./acss";

export default class TextPaintConfig extends Component /*:: <Props, State> */ {
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

    renderColorTextField(key/*: string */, text/*: string */, key2, i) {
        const value = this.props.settings[key2][i]["style"][key] || this.props.settings["textStyle"][key];

        return <ListItem noIndent style={a("pl-12")} onPress={() => {
            this.setState({
                doShowColorPicker: true,
                colorPickerProps: {
                    color: value,
                    onOk: hex => {
                        this.state.doShowColorPicker = false;
                        this.state.colorPickerSwatches.push(hex);
                        this.updateSettingsAndSetState({ [key2]: { [i]: { style: { [key]: { $set: hex } } } } });
                    },
                }
            });
        }}>
            <Text style={a("fx-1 px-10 fw-600")}>{text}</Text>
            <Text style={{ marginHorizontal: 10, width: 10, backgroundColor: value }} />
            <View style={a("fx-1")}>
                <Item regular>
                    <Input style={a("fz-16 h-30 p-0")} value={value}
                        onChangeText={text => this.updateSettingsAndSetState({ [key2]: { [i]: { style: { [key]: { $set: text } } } } })} />
                </Item>
            </View>
        </ListItem>;
    }

    renderNumberTextField(key/*: string */, text/*: string */, key2, i) {
        const value = this.props.settings[key2][i]["style"][key] || this.props.settings["textStyle"][key];

        return <ListItem noIndent style={a("pl-12")}>
            <Text style={a("fx-1 px-10 fw-600")}>{text}</Text>
            <View style={a("fx-1")}>
                <Item regular>
                    <Input style={a("fz-16 h-30 p-0")} value={value.toString()}
                        onChangeText={text => {
                            text = !text || text.length === 0 ? 0 : parseInt(text);
                            this.updateSettingsAndSetState({ [key2]: { [i]: { style: { [key]: { $set: text } } } } });
                        }}
                        keyboardType="numeric" />
                </Item>
            </View>
        </ListItem>;
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
                    <View style={{ marginBottom: 20, backgroundColor: this.props.settings.pageColor }}>
                        <View style={{
                            backgroundColor: this.props.settings.lineColor,
                            paddingHorizontal: this.props.settings.linePaddingX ? this.props.settings.linePaddingX : 0,
                            paddingVertical: this.props.settings.linePaddingY ? this.props.settings.linePaddingY : 0,
                        }}>
                            <Text style={this.props.settings.textPaints[parseFloat(this.props.i)].style}>Sample text</Text>
                        </View>
                    </View>
                    <Text style={{ padding: 15 }}>Text Paint for  {this.props.regExp}</Text>
                    {this.renderFontWeightSelectField("fontWeight", "Font weight", "textPaints", this.props.i)}
                    {this.renderNumberTextField("fontSize", "Font size", "textPaints", this.props.i)}
                    {this.renderColorTextField("color", "Font color", "textPaints", this.props.i)}
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