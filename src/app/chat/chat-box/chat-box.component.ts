import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { SocketService } from 'src/app/socket.service';
import { AppService } from 'src/app/app.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Cookie } from 'ng2-cookies/ng2-cookies';
//import { userInfo } from 'os';

@Component({
  selector: 'app-chat-box',
  templateUrl: './chat-box.component.html',
  styleUrls: ['./chat-box.component.css'],
  providers: [SocketService]
})
export class ChatBoxComponent implements OnInit {

  @ViewChild('scrollMe', { read: ElementRef }) 
  
  public authToken: any;
  public userInfo: any;
	public userList: any[];
  public disconnectedSocket: boolean;  

  public scrollToChatTop:boolean= false;

  public receiverId: any;
  public receiverName: any;
  public previousChatList: any = [];
  public messageText: any; 
  public messageList: any = []; // stores the current message list display in chat box
  public pageValue: number = 0;
  public loadingPreviousChat: boolean = false;
  

  constructor(
    public AppService: AppService,
    public SocketService: SocketService,
    public router: Router,
    private toastr: ToastrService
  ) { 
        this.receiverId= Cookie.get('receiverId');
        this.receiverName = Cookie.get('receiverName');

  }

 
  ngOnInit() {

     this.authToken = Cookie.get('authToken');
     this.userInfo = this.AppService.getUserInfoFromLocalstorage();
     console.log(this.userInfo)
     this.receiverId = Cookie.get("receiverId");

     this.receiverName =  Cookie.get('receiverName');
     
     this.checkStatus();

     this.verifyUserConfirmation();
     this.getOnlineUserList();
     if(this.receiverId!=null && this.receiverId!=undefined && this.receiverId!=''){
      //console.log(this.receiverId + this.receiverName);
      //this.userSelectedToChat(this.receiverId,this.receiverName)
    }
     this.getMessageFromAUser();

  }//end of ngOnInt()


  public checkStatus: any = () => {

    if (Cookie.get('authToken') === undefined || Cookie.get('authToken') === '' || Cookie.get('authToken') === null) {

      this.router.navigate(['/']);

      return false;

    } else {

      return true;

    }

  } // end checkStatus



  public verifyUserConfirmation: any = () => {

    this.SocketService.verifyUser()
      .subscribe((data) => {
        this.disconnectedSocket = false;
        this.SocketService.setUser(Cookie.get('authToken'));

      });
    }
  
  public getOnlineUserList :any =()=>{

    this.SocketService.onlineUserList()
      .subscribe((userList) => {

        this.userList = [];

        for (let x in userList) {

          let temp = { 'userId': x, 'name': userList[x], 'unread': 0, 'chatting': false };

          this.userList.push(temp);          

        }
        
        console.log(this.userList);

      }); // end online-user-list
  }

  // chat related methods 


  public getPreviousChatWithAUser :any = ()=>{
    let previousData = (this.messageList.length > 0 ? this.messageList.slice() : []);
    
    this.SocketService.getChat(this.userInfo.userId, this.receiverId, this.pageValue * 10)
    .subscribe((apiResponse) => {

      console.log(apiResponse);

      if (apiResponse.status == 200) {

        this.messageList = apiResponse.data.concat(previousData);

      } else {

        this.messageList = previousData;
        this.toastr.warning('No Messages available');
      }

      this.loadingPreviousChat = false;

    }, (err) => {

      this.toastr.error('some error occured')


    });

  }// end get previous chat with any user


  public loadEarlierPageOfChat: any = () => {

    this.loadingPreviousChat = true;

    this.pageValue++;
    this.scrollToChatTop = true;

    this.getPreviousChatWithAUser() 

  } // end loadPreviousChat

  public userSelectedToChat: any = (id, name) => {

    console.log("setting user as active"+id + name); 

    // setting that user to chatting true   
    this.userList.map((user)=>{
        if(user.userId==id){
          user.chatting=true;
        }
        else{
          user.chatting = false;
        }
    })

    Cookie.set('receiverId', id);

    Cookie.set('receiverName', name);


    this.receiverName = name;

    this.receiverId = id;

    this.messageList = [];

    this.pageValue = 0;

    let chatDetails = {
      userId: this.userInfo.userId,
      senderId: id
    }


    this.SocketService.markChatAsSeen(chatDetails);

    this.getPreviousChatWithAUser();

  } // end userBtnClick function






  public sendMessageUsingKeypress: any = (event: any) => {

    if (event.keyCode === 13) { // 13 is keycode of enter.

      this.sendMessage();

    }

  } // end sendMessageUsingKeypress

  public sendMessage: any = () => {

    if(this.messageText){

      let chatMsgObject = {
        senderName: this.userInfo.firstName + " " + this.userInfo.lastName,
        senderId: this.userInfo.userId,
        receiverName: Cookie.get('receiverName'),
        receiverId: Cookie.get('receiverId'),
        message: this.messageText,
        createdOn: new Date()
      } // end chatMsgObject
      console.log(chatMsgObject);
      this.SocketService.SendChatMessage(chatMsgObject)
      this.pushToChatWindow(chatMsgObject)


    }
    else{
      this.toastr.warning('text message can not be empty')

    }

  } // end sendMessage

  public pushToChatWindow : any =(data)=>{

    this.messageText="";
    this.messageList.push(data);
    this.scrollToChatTop = false;


  }// end push to chat window

  public getMessageFromAUser :any =()=>{

      this.SocketService.chatByUserId(this.userInfo.userId)
      .subscribe((data)=>{
       

        (this.receiverId==data.senderId)?this.messageList.push(data):'';

        this.toastr.success(`${data.senderName} says : ${data.message}`)

        this.scrollToChatTop=false;

      });//end subscribe

  }// end get message from a user 


  public logout: any = () => {

    this.AppService.logout()
      .subscribe((apiResponse) => {

        if (apiResponse.status === 200) {
          console.log("logout called")
          Cookie.delete('authToken');

          Cookie.delete('receiverId');

          Cookie.delete('receiverName');

          this.SocketService.exitSocket()

          this.router.navigate(['/']);

        } else {
          this.toastr.error(apiResponse.message)

        } // end condition

      }, (err) => {
        this.toastr.error('some error occured')


      });

  } 
}