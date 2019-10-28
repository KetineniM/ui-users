import PropTypes from 'prop-types';

import { deliveryFulfillmentValues } from './constants';

const {
  HOLD_SHELF,
  DELIVERY,
} = deliveryFulfillmentValues;

export const addressTypesShape = PropTypes.arrayOf(PropTypes.shape({
  id: PropTypes.string.isRequired,
  addressType: PropTypes.string.isRequired,
}));

export const requestPreferencesShape = PropTypes.shape({
  holdShelf: PropTypes.bool.isRequired,
  delivery: PropTypes.bool.isRequired,
  defaultDeliveryAddressTypeId: PropTypes.string,
  defaultServicePointId: PropTypes.string,
  fulfillment: PropTypes.oneOf([HOLD_SHELF, DELIVERY])
});
