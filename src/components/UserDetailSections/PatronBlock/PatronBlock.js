import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import {
  FormattedMessage,
  injectIntl,
} from 'react-intl';
import moment from 'moment';

import {
  Row,
  Col,
  Accordion,
  Icon,
  MultiColumnList,
  Button,
  Headline
} from '@folio/stripes/components';
import { stripesConnect } from '@folio/stripes/core';

import { calculateSortParams } from '../../util';

import css from './PatronBlock.css';

class PatronBlock extends React.Component {
  static manifest = Object.freeze({
    patronBlocks: {
      type: 'okapi',
      records: 'manualblocks',
      path: 'manualblocks',
      accumulate: 'true',
      fetch: false,
      DELETE: {
        path: 'manualblocks/%{activeRecord.blockId}',
      },
    },
    automatedPatronBlocks: {
      type: 'okapi',
      records: 'automatedPatronBlocks',
      path: 'automated-patron-blocks?query=(patronId=:{id})&limit=100',
    },
    activeRecord: {},
  });

  static propTypes = {
    stripes: PropTypes.shape({
      hasPerm: PropTypes.func,
    }),
    history: PropTypes.object,
    match: PropTypes.object,
    intl: PropTypes.object.isRequired,
    onToggle: PropTypes.func,
    expanded: PropTypes.bool,
    accordionId: PropTypes.string,
    patronBlocks: PropTypes.arrayOf(PropTypes.object),
    automatedPatronBlocks: PropTypes.arrayOf(PropTypes.object),
    hasPatronBlocks: PropTypes.bool,
    mutator: PropTypes.shape({
      activeRecord: PropTypes.shape({
        update: PropTypes.func,
      }),
      patronBlocks: PropTypes.shape({
        DELETE: PropTypes.func,
        GET: PropTypes.func,
        reset: PropTypes.func,
      }),
      automatedPatronBlocks: PropTypes.shape({
        GET: PropTypes.func,
      }),
    }),
    user: PropTypes.object,
  };

  static defaultProps = {
    patronBlocks: [],
    automatedPatronBlocks: [
      {
        'patronBlockConditionId': '48a3115d-d476-4582-b6a8-55c09eed7ec7',
        'blockBorrowing': true,
        'blockRenewal': false,
        'blockRequest': false,
        'message': 'Patron has reached maximum allowed number of items charged out'
      },
      {
        'patronBlockConditionId': '48a3115d-d476-4582-b6a8-55c09eed7ec7',
        'blockBorrowing': false,
        'blockRenewal': false,
        'blockRequest': true,
        'message': 'Patron has reached maximum allowed outstanding fee/fine balance for his/her patron group'
      },
      {
        'patronBlockConditionId': '48a3115d-d476-4582-b6a8-55c09eed7ec7',
        'blockBorrowing': true,
        'blockRenewal': true,
        'blockRequest': true,
        'message': 'Patron has reached maximum allowed outstanding fee/fine balance for his/her patron group'
      }
    ],
  };

  constructor(props) {
    super(props);

    this.onSort = this.onSort.bind(this);
    this.onRowClick = this.onRowClick.bind(this);
    const { intl: { formatMessage } } = props;

    this.sortMap = {
      [formatMessage({ id: 'ui-users.blocks.columns.type' })]: f => f.type,
      [formatMessage({ id: 'ui-users.blocks.columns.desc' })]: f => f.desc || f.message,
      [formatMessage({ id: 'ui-users.blocks.columns.blocked' })]: f => f.renewals,
    };


    this.state = {
      sortOrder: [
        formatMessage({ id: 'ui-users.blocks.columns.type' }),
        formatMessage({ id: 'ui-users.blocks.columns.desc' }),
        formatMessage({ id: 'ui-users.blocks.columns.blocked' }),
      ],
      sortDirection: ['desc', 'asc'],
      submitting: false,
    };
  }

  componentDidMount() {
    const { mutator: { patronBlocks }, user, onToggle, expanded, accordionId } = this.props;
    const query = `userId=${user.id}`;
    patronBlocks.reset();
    patronBlocks.GET({ params: { query } }).then(records => {
      const blocks = records.filter(p => moment(moment(p.expirationDate).format()).isSameOrAfter(moment().format()));
      if ((blocks.length > 0 && !expanded) || (!blocks.length && expanded)) {
        onToggle({ id: accordionId });
      }
    });
  }

  componentDidUpdate(prevProps) {
    const {
      patronBlocks,
      automatedPatronBlocks,
    } = this.props;
    const prevManualBlocks = prevProps.patronBlocks;
    const prevAutomatedBlocks = prevProps.automatedPatronBlocks;
    const { submitting } = this.state;
    const prevExpirated = prevManualBlocks.filter(p => moment(moment(p.expirationDate).format()).isSameOrBefore(moment().format()) && p.expirationDate) || [];
    const expirated = prevManualBlocks.filter(p => moment(moment(p.expirationDate).format()).isSameOrBefore(moment().format()) && p.expirationDate) || [];

    if (prevExpirated.length > 0 && expirated.length === 0) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ submitting: false });
    }

    if (expirated.length > 0 && !submitting) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ submitting: true });
      expirated.forEach(p => {
        this.props.mutator.activeRecord.update({ blockId: p.id });
        this.props.mutator.patronBlocks.DELETE({ id: p.id });
      });
    }
  }

  onSort(e, meta) {
    if (!this.sortMap[meta.alias]) return;

    const {
      sortOrder,
      sortDirection,
    } = this.state;

    this.setState(calculateSortParams({
      sortOrder,
      sortDirection,
      sortValue: meta.alias,
      secondarySortOrderIndex: 1,
      secondarySortDirectionIndex: 1,
    }));
  }

  onRowClick(e, row) {
    const {
      history,
      match: { params }
    } = this.props;

    const permAbled = this.props.stripes.hasPerm('ui-users.patron_blocks');
    if (permAbled === true && (e.target.type !== 'button') && (e.target.tagName !== 'IMG')) {
      history.push(`/users/${params.id}/patronblocks/edit/${row.id}`);
    }
  }

  getPatronFormatter() {
    const {
      intl: {
        formatMessage
      },
    } = this.props;

    return {
      'Type': f => f.type || [formatMessage({ id: 'ui-users.blocks.columns.automated.type' })],
      'Display description': f => f.desc || f.message,
      'Blocked actions': f => {
        const blockedActions = [];

        if (f.borrowing || f.blockBorrowing) {
          blockedActions.push([formatMessage({ id: 'ui-users.blocks.columns.borrowing' })]);
        }

        if (f.renewals || f.blockRenewal) {
          blockedActions.push([formatMessage({ id: 'ui-users.blocks.columns.renewals' })]);
        }

        if (f.requests || f.blockRequest) {
          blockedActions.push([formatMessage({ id: 'ui-users.blocks.columns.requests' })]);
        }

        return blockedActions.join(', ');
      }
    };
  }

  render() {
    const {
      expanded,
      onToggle,
      accordionId,
      patronBlocks,
      automatedPatronBlocks,
      hasPatronBlocks,
      match: { params },
    } = this.props;
    const {
      sortOrder,
      sortDirection
    } = this.state;
    let contentData = patronBlocks.filter(p => moment(moment(p.expirationDate).format()).isSameOrAfter(moment().format()));
    contentData = _.orderBy(contentData, ['metadata.createdDate'], ['desc']);
    const totalPatronBlocks = _.concat(automatedPatronBlocks, contentData);
    const visibleColumns = [
      'Type',
      'Display description',
      'Blocked actions',
    ];
    const buttonDisabled = this.props.stripes.hasPerm('ui-users.patron_blocks');
    const displayWhenOpen =
      <Button id="create-patron-block" disabled={!buttonDisabled} to={{ pathname: `/users/${params.id}/patronblocks/create` }}>
        <FormattedMessage id="ui-users.blocks.buttons.add" />
      </Button>;
    const items =
      <MultiColumnList
        id="patron-block-mcl"
        contentData={totalPatronBlocks}
        formatter={this.getPatronFormatter()}
        visibleColumns={visibleColumns}
        onHeaderClick={this.onSort}
        sortOrder={sortOrder[0]}
        sortDirection={`${sortDirection[0]}ending`}
        onRowClick={this.onRowClick}
        columnWidths={{
          'Type': '100px',
          'Display description': '350px',
          'Blocked actions': '250px'
        }}
      />;
    const title =
      <Row>
        <Col>
          <Headline className={css.headlineLabel} size="large" tag="h3">
            <FormattedMessage id="ui-users.blocks.label" />
          </Headline>
        </Col>
        <Col>{(hasPatronBlocks) ? <Icon size="medium" icon="exclamation-circle" status="error" /> : ''}</Col>
      </Row>;
    return (
      <Accordion
        open={expanded}
        id={accordionId}
        onToggle={onToggle}
        label={title}
        displayWhenOpen={displayWhenOpen}
      >
        <Row><Col xs>{items}</Col></Row>
      </Accordion>

    );
  }
}

export default stripesConnect(injectIntl(PatronBlock));
