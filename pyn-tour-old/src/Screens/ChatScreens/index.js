
import React, { Component } from 'react';
import { GiftedChat } from 'react-native-gifted-chat'
import { View, Text, ImageBackground } from 'react-native';
import Spinner from "react-native-loading-spinner-overlay";
import { widthPercentageToDP as wp, heightPercentageToDP as hp, } from 'react-native-responsive-screen';

import R from "../../assest/R"
import Singleton from "../../Singleton"
import { getChatHistory } from "../../Library/ServerCalls/API"
import { sendChatMessage } from "../../Library/ServerCalls/API"
import { getLatestMessages } from "../../Library/ServerCalls/API"
import { ringBell } from '../../Utils/Helpers';
import Header from '../../Library/Components/Header/index'
import LoadingIndicator from '../../Components/LoadingIndicator';


export default class ChatScrreen extends Component {

  state = {
    messages: [],
    isLoading: true,
    agentLoginStatus: true,
    agentMessage: ""
  }

  constructor() {
    super();
    this.timer = null
    this.getNewMessageCallInProgress = false
    //this.agentLoginStatus = Singleton.getInstance().getTourSetting().chat_control
    this.userID = Number(Singleton.getInstance().getTourUserId())
  }

  componentDidMount() {
    this.getChatHistory()
  }

  componentWillUnmount() {
    clearInterval(this.timer);
  }

  getChatHistory = () => {
    this.setState({ isLoading: true })
    // debugger
    getChatHistory()
      .then(response => response.json())
      .then(responseJson => {
        // debugger
        if (responseJson.stats === "OK") {
          this.setState({
            messages: responseJson.messages,
            isLoading: false
          })
          this.chatroomID = responseJson.chatroom_id
          if (responseJson.messages.length > 0) {
            this.lastMessageId = responseJson.messages[0]._id
            Singleton.getInstance().setLastMessageId(this.lastMessageId)
          }
          this.timer = setInterval(this.tick, 4000);
        } else {
          this.setState({ isLoading: false })
          alert("Error")
        }
      })
      .catch(error => {
        this.setState({ isLoading: false });
        console.log(error);
      });
  };

  sendChatMessage = (message, createdAt) => {
    // debugger
    sendChatMessage(message, this.chatroomID, createdAt)
      .then(response => response.json())
      .then(responseJson => {
        // debugger
      })
      .catch(error => {
        this.setState({ isLoading: false });
        console.log(error);
      });
  };

  tick = () => {
    if (!this.getNewMessageCallInProgress) {
      this.getNewMessageCallInProgress = true
      getLatestMessages(this.lastMessageId, this.chatroomID)
        .then(response => response.json())
        .then(responseJson => {
          this.getNewMessageCallInProgress = false
          // debugger
          if (responseJson.messages.length > 0) {
            // ring bell here
            ringBell()
            this.setState(previousState => ({
              messages: GiftedChat.append(previousState.messages, responseJson.messages),
            }))
            this.lastMessageId = responseJson.messages[0]._id
            Singleton.getInstance().setLastMessageId(this.lastMessageId)
          }
          this.setState({ agentLoginStatus: responseJson.chat_control })
          this.setState({ agentMessage: responseJson.agent_status })
        })
        .catch(error => {
          this.getNewMessageCallInProgress = false
          console.log(error);
        });
    }
  }

  onSend(messages = []) {
    // debugger
    if (messages.length > 0) {
      this.sendChatMessage(messages[0].text, messages[0].createdAt)
      this.setState(previousState => ({
        messages: GiftedChat.append(previousState.messages, messages),
      }))
    }
  }

  render() {
    const { navigation } = this.props;
    return (
      <ImageBackground source={R.images.backgroundImage} style={{ flex: 1 }}
        imageStyle={{
          resizeMode: "stretch"
        }}>
          <Header backBtnVisible={true} title="Chat" navigation={navigation} onGoBack={() => {
          if (navigation.goBack()) {
            navigation.goBack()
          } else {
            navigation.replace("Welcome");
          }
        }} />
        {/* <Spinner visible={this.state.isLoading} textStyle={{ color: '#FFF' }} /> */}
        <LoadingIndicator visible={this.state.isLoading} />
        {this.state.agentLoginStatus ? <GiftedChat
          messages={this.state.messages}
          onSend={messages => this.onSend(messages)}
          renderUsernameOnMessage={true}
          user={{
            _id: this.userID,
          }}
        /> : <Text style={{
          textAlign: 'center',
          marginTop: hp('30%'),
          color: 'white',
          fontSize: hp('1.8%'),
          lineHeight: hp('3.7%'),
          fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
        }}>{this.state.agentMessage} </Text>}
      </ImageBackground>
    )
  }
}