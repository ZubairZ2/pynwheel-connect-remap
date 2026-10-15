import React from 'react'

const MyContext = React.createContext();

export default MyContext;

export const AppConsumer = MyContext.Consumer;

export class AppProvider extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            name: 0,
            chatStatus: false,
            chatButtonLastCount:0  // chat button last time read count
        }
    }

    setUnReadMessageCount1 = (count, chatButtonStatus) => {
        if (count !== this.state.name) {
            this.setState({ name: count })
        }
        if (chatButtonStatus !== this.state.chatStatus) {
            this.setState({ chatStatus: chatButtonStatus })
        }
    }
    setChatButtonLastCount=async(chatButtonLastCount)=>{
        if(chatButtonLastCount && chatButtonLastCount !==this.state.chatButtonLastCount){
            this.setState({chatButtonLastCount})
        }
    }
    resetChatButtonLastCount=async(callBack)=>{
        this.setState({chatButtonLastCount:0,MyName:0},()=>{
            if(callBack){
                callBack()
            }
        })
    }

    render() {
        return (
            <MyContext.Provider value={{
                MyName: this.state.name,
                buttonStatus: this.state.chatStatus,
                setUnReadMessageCount: this.setUnReadMessageCount1,
                setChatButtonLastCount:this.setChatButtonLastCount,
                resetCount:this.resetChatButtonLastCount,
                chatButtonLastCount:this.state.chatButtonLastCount
            }}>
                {this.props.children}
            </MyContext.Provider>
        )
    }
}


