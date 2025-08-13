<script>
const SP_PUBLIC_KEY = "test_pk4YTFRP4VMMFMIG3VFTNCNRWF9IEAQG5OIFG5X1D65VX69K201K"; //Your website public key
const SP_FORM_ID = "#spaceremit-form"; // Identifier for the form
const SP_SELECT_RADIO_NAME = "sp-pay-type-radio"; // Name attribute of radio buttons

const LOCAL_METHODS_BOX_STATUS = true; // Status of local payment methods box
const LOCAL_METHODS_PARENT_ID = "#spaceremit-local-methods-pay"; // Identifier for the container of local payment methods

const CARD_BOX_STATUS = true; // Status of card payment box
const CARD_BOX_PARENT_ID = "#spaceremit-card-pay"; // Identifier for the container of card payment
let SP_FORM_AUTO_SUBMIT_WHEN_GET_CODE = true; // Flag indicating whether the form should automatically submit when getting a code

// Callback function for successful payment
function SP_SUCCESSFUL_PAYMENT(spaceremit_code) {}
// Callback function for failed payment
function SP_FAILD_PAYMENT() {}
// Callback function for receiving message
function SP_RECIVED_MESSAGE(message) {alert(message);}
// Callback function for needing authentication
function SP_NEED_AUTH(target_auth_link) {}
</script>
