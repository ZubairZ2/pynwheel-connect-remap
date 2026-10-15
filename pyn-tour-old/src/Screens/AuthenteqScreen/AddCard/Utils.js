
export const validateCard=(v)=>{
    v = v.replace(/\D/g, ''); // Remove non-numerics
    v = v.replace(/(\d{4})(?=\d)/g, '$1-'); // Add dashes every 4th digit
    return v
}

export const validateCVV=(v)=>{
    v = v.replace(/\D/g, ''); // Remove non-numerics
    return v
}

export const validateMonth=(v)=>{
    v = v.replace(/\D/g, ''); // Remove non-numerics
    return v
}

export const validateYear=(v)=>{
    v = v.replace(/\D/g, ''); // Remove non-numerics
    return v
}

export const validateForm=(data)=>{
    const {card_no,cvv,exp_month,exp_year}=data
    let message=""
    let status=true
    if(!card_no || !cvv || !exp_month || !exp_year){
        message="Please fill all fields"
        status=false
    }
    let cardLen=new String(card_no).length
    if(cardLen !== 19){
        message="Please enter valid 14 digit Credit Card number"
        status=false
    }
    let cvvLen=new String(cvv).length
    if(cvvLen !==3){
        message="Please enter valid CVV code"
        status=false
    }
    if(exp_month < 0 || exp_month > 12){
        message="Please enter valid Expiry Month"
        status=false
    }
    let expYearLen=new String(exp_year).length
    if(expYearLen < 0 || expYearLen >4 || exp_year < new Date().getFullYear()){
        message="Please enter valid expiry year"
        status=false
    }
    return {
        status,
        message
    }
}
export const getNext50Yrs=()=>{
    let arr=[]
    const currentYr=new Date().getFullYear()
    for(let i=0; i<50; i++){
        arr.push({label:currentYr+i+"",value:currentYr+i+""})
    }
    return arr
}
export const monthsList= [
    {label:"01",value:"01"},
    {label:"02",value:"02"},
    {label:"03",value:"03"},
    {label:"04",value:"04"},
    {label:"05",value:"05"},
    {label:"06",value:"06"},
    {label:"07",value:"07"},
    {label:"08",value:"08"},
    {label:"09",value:"09"},
    {label:"10",value:"10"},
    {label:"11",value:"11"},
    {label:"12",value:"12"},
]